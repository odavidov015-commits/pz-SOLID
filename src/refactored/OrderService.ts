/**
 * REFACTORED CODE — застосування всіх SOLID принципів
 *
 * SRP  — кожен клас має одну відповідальність
 * OCP  — нові знижки додаються через нові класи, без зміни існуючих
 * LSP  — ValidatedOrder не порушує контракт базового Order
 * ISP  — невеликі специфічні інтерфейси
 * DIP  — залежності через абстракції (інтерфейси)
 */

import {
  INotifier,
  IOrderRepository,
  IReportService,
  IDiscountStrategy,
  IOrderProcessor,
  IOrder,
} from "../interfaces";

// ─────────────────────────────────────────────
// ✅ SRP — EmailNotifier: лише відправка email
// ─────────────────────────────────────────────
export class EmailNotifier implements INotifier {
  send(to: string, message: string): void {
    console.log(`[Email] → ${to}: ${message}`);
  }
}

// ✅ SRP — SmsNotifier: лише відправка SMS (легко додати завдяки ISP + OCP)
export class SmsNotifier implements INotifier {
  send(to: string, message: string): void {
    console.log(`[SMS] → ${to}: ${message}`);
  }
}

// ─────────────────────────────────────────────
// ✅ SRP — InMemoryOrderRepository: лише збереження
// ─────────────────────────────────────────────
export class InMemoryOrderRepository implements IOrderRepository {
  private orders: IOrder[] = [];

  save(order: IOrder): void {
    this.orders.push(order);
    console.log(`[DB] Saved order #${order.id}`);
  }

  findAll(): IOrder[] {
    return [...this.orders];
  }
}

// ─────────────────────────────────────────────
// ✅ SRP — OrderReportService: лише звіти
// ─────────────────────────────────────────────
export class OrderReportService implements IReportService {
  constructor(private repository: IOrderRepository) {}

  generateReport(): string {
    const orders = this.repository.findAll();
    const total = orders.reduce((sum, o) => sum + (o.finalPrice ?? o.price), 0);
    return `Total orders: ${orders.length}, Revenue: ${total}`;
  }
}

// ─────────────────────────────────────────────
// ✅ OCP — стратегії знижок: нова знижка = новий клас, не зміна існуючих
// ─────────────────────────────────────────────
export class RegularDiscount implements IDiscountStrategy {
  calculate(price: number): number {
    return price * 0.05; // 5%
  }
}

export class VipDiscount implements IDiscountStrategy {
  calculate(price: number): number {
    return price * 0.15; // 15%
  }
}

export class EmployeeDiscount implements IDiscountStrategy {
  calculate(price: number): number {
    return price * 0.30; // 30%
  }
}

// ✅ OCP: нова знижка додається без зміни існуючого коду
export class SeasonalDiscount implements IDiscountStrategy {
  calculate(price: number): number {
    return price * 0.20; // 20% сезонна
  }
}

// ✅ OCP: фабрика для підбору стратегії знижки
export class DiscountFactory {
  private static strategies: Record<string, IDiscountStrategy> = {
    regular: new RegularDiscount(),
    vip: new VipDiscount(),
    employee: new EmployeeDiscount(),
    seasonal: new SeasonalDiscount(),
  };

  static getStrategy(type: string): IDiscountStrategy {
    return this.strategies[type] ?? { calculate: () => 0 };
  }
}

// ─────────────────────────────────────────────
// ✅ LSP — Order та ValidatedOrder
// ─────────────────────────────────────────────
export class Order implements IOrder {
  public finalPrice?: number;

  constructor(
    public id: number,
    public price: number,
    public customerEmail: string,
    public customerType: string
  ) {}

  getDescription(): string {
    return `Order #${this.id}, price: ${this.price}`;
  }

  // ✅ завжди повертає число — контракт ніколи не порушується
  getTotalPrice(): number {
    return this.price;
  }
}

// ✅ LSP: ValidatedOrder замінює Order скрізь без сюрпризів
// Замість кидання винятку — повертає 0 та логує попередження
export class ValidatedOrder extends Order {
  private static readonly MIN_PRICE = 100;

  getTotalPrice(): number {
    if (this.price < ValidatedOrder.MIN_PRICE) {
      // ✅ не кидає виняток — повертає 0 і попереджає, як очікується від Order
      console.warn(
        `[ValidatedOrder] Order #${this.id} price ${this.price} is below minimum. Returning 0.`
      );
      return 0;
    }
    return this.price * 0.85; // 15% знижка для валідованих замовлень
  }
}

// ─────────────────────────────────────────────
// ✅ SRP + DIP — OrderProcessor: лише бізнес-логіка обробки
// Залежить від абстракцій (інтерфейсів), не від конкретних класів
// ─────────────────────────────────────────────
export class OrderProcessor implements IOrderProcessor {
  constructor(
    private repository: IOrderRepository,  // ✅ DIP
    private notifier: INotifier,            // ✅ DIP
  ) {}

  processOrder(order: IOrder): void {
    // Розраховуємо знижку через стратегію
    const strategy = DiscountFactory.getStrategy(order.customerType);
    const discount = strategy.calculate(order.price);
    order.finalPrice = order.price - discount;

    // Зберігаємо через абстракцію
    this.repository.save(order);

    // Надсилаємо повідомлення через абстракцію
    this.notifier.send(
      order.customerEmail,
      `Your order #${order.id} confirmed! Total: ${order.finalPrice}`
    );

    console.log(`[Processor] Order #${order.id} processed. Final: ${order.finalPrice}`);
  }
}

// ─────────────────────────────────────────────
// ✅ DIP — CheckoutController залежить від інтерфейсу IOrderProcessor
// ─────────────────────────────────────────────
export class CheckoutController {
  // ✅ DIP: залежить від абстракції, а не від конкретного класу
  constructor(private processor: IOrderProcessor) {}

  checkout(order: IOrder): void {
    this.processor.processOrder(order);
  }
}
