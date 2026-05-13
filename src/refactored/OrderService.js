"use strict";
/**
 * REFACTORED CODE — застосування всіх SOLID принципів
 * (JS версія для Jest)
 *
 * SRP  — кожен клас має одну відповідальність
 * OCP  — нові знижки додаються через нові класи, без зміни існуючих
 * LSP  — ValidatedOrder не порушує контракт базового Order
 * ISP  — невеликі специфічні інтерфейси (задокументовані в interfaces/index.ts)
 * DIP  — залежності через абстракції (конструктор-інʼєкція)
 */
Object.defineProperty(exports, "__esModule", { value: true });

// ─────────────────────────────────────────────
// ✅ SRP — EmailNotifier: лише відправка email
// ─────────────────────────────────────────────
class EmailNotifier {
  send(to, message) {
    console.log(`[Email] → ${to}: ${message}`);
  }
}

// ✅ SRP — SmsNotifier: лише відправка SMS
class SmsNotifier {
  send(to, message) {
    console.log(`[SMS] → ${to}: ${message}`);
  }
}

// ─────────────────────────────────────────────
// ✅ SRP — InMemoryOrderRepository: лише збереження
// ─────────────────────────────────────────────
class InMemoryOrderRepository {
  constructor() {
    this.orders = [];
  }

  save(order) {
    this.orders.push(order);
    console.log(`[DB] Saved order #${order.id}`);
  }

  findAll() {
    return [...this.orders];
  }
}

// ─────────────────────────────────────────────
// ✅ SRP — OrderReportService: лише звіти
// ─────────────────────────────────────────────
class OrderReportService {
  constructor(repository) {
    this.repository = repository;
  }

  generateReport() {
    const orders = this.repository.findAll();
    const total = orders.reduce((sum, o) => sum + (o.finalPrice ?? o.price), 0);
    return `Total orders: ${orders.length}, Revenue: ${total}`;
  }
}

// ─────────────────────────────────────────────
// ✅ OCP — стратегії знижок: нова знижка = новий клас
// ─────────────────────────────────────────────
class RegularDiscount {
  calculate(price) { return price * 0.05; }
}

class VipDiscount {
  calculate(price) { return price * 0.15; }
}

class EmployeeDiscount {
  calculate(price) { return price * 0.30; }
}

// ✅ OCP: нова знижка — новий клас, без зміни існуючих
class SeasonalDiscount {
  calculate(price) { return price * 0.20; }
}

// ✅ OCP: фабрика для підбору стратегії
class DiscountFactory {
  static getStrategy(type) {
    const strategies = {
      regular: new RegularDiscount(),
      vip: new VipDiscount(),
      employee: new EmployeeDiscount(),
      seasonal: new SeasonalDiscount(),
    };
    return strategies[type] ?? { calculate: () => 0 };
  }
}

// ─────────────────────────────────────────────
// ✅ LSP — Order та ValidatedOrder
// ─────────────────────────────────────────────
class Order {
  constructor(id, price, customerEmail, customerType) {
    this.id = id;
    this.price = price;
    this.customerEmail = customerEmail;
    this.customerType = customerType;
    this.finalPrice = undefined;
  }

  getDescription() {
    return `Order #${this.id}, price: ${this.price}`;
  }

  // ✅ завжди повертає number — контракт ніколи не порушується
  getTotalPrice() {
    return this.price;
  }
}

// ✅ LSP: ValidatedOrder замінює Order скрізь без сюрпризів
class ValidatedOrder extends Order {
  getTotalPrice() {
    if (this.price < ValidatedOrder.MIN_PRICE) {
      // ✅ не кидає виняток — повертає 0, як очікується від Order
      console.warn(
        `[ValidatedOrder] Order #${this.id} price ${this.price} is below minimum. Returning 0.`
      );
      return 0;
    }
    return this.price * 0.85;
  }
}
ValidatedOrder.MIN_PRICE = 100;

// ─────────────────────────────────────────────
// ✅ SRP + DIP — OrderProcessor: лише бізнес-логіка
// ─────────────────────────────────────────────
class OrderProcessor {
  constructor(repository, notifier) {
    this.repository = repository; // ✅ DIP — абстракція IOrderRepository
    this.notifier = notifier;     // ✅ DIP — абстракція INotifier
  }

  processOrder(order) {
    const strategy = DiscountFactory.getStrategy(order.customerType);
    const discount = strategy.calculate(order.price);
    order.finalPrice = order.price - discount;

    this.repository.save(order);
    this.notifier.send(
      order.customerEmail,
      `Your order #${order.id} confirmed! Total: ${order.finalPrice}`
    );

    console.log(`[Processor] Order #${order.id} processed. Final: ${order.finalPrice}`);
  }
}

// ─────────────────────────────────────────────
// ✅ DIP — CheckoutController залежить від IOrderProcessor
// ─────────────────────────────────────────────
class CheckoutController {
  constructor(processor) {
    this.processor = processor; // ✅ DIP — абстракція IOrderProcessor
  }

  checkout(order) {
    this.processor.processOrder(order);
  }
}

module.exports = {
  EmailNotifier,
  SmsNotifier,
  InMemoryOrderRepository,
  OrderReportService,
  RegularDiscount,
  VipDiscount,
  EmployeeDiscount,
  SeasonalDiscount,
  DiscountFactory,
  Order,
  ValidatedOrder,
  OrderProcessor,
  CheckoutController,
};
