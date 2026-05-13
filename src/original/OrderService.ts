/**
 * ORIGINAL CODE — навмисні порушення SOLID
 */

// ❌ ISP: один великий інтерфейс
interface IWorker {
  processOrder(order: any): void;
  sendEmail(to: string, message: string): void;
  saveToDatabase(data: any): void;
  generateReport(): string;
  calculateDiscount(price: number, type: string): number;
}

// ❌ SRP: клас робить занадто багато
class OrderService implements IWorker {
  private orders: any[] = [];

  processOrder(order: any): void {
    console.log(`Processing order #${order.id}`);
    const discount = this.calculateDiscount(order.price, order.customerType);
    order.finalPrice = order.price - discount;
    this.saveToDatabase(order);
    this.sendEmail(order.customerEmail, `Your order #${order.id} is confirmed!`);
    console.log(`Order #${order.id} saved. Final price: ${order.finalPrice}`);
  }

  sendEmail(to: string, message: string): void {
    console.log(`Sending email to ${to}: ${message}`);
  }

  saveToDatabase(data: any): void {
    this.orders.push(data);
    console.log(`Saved to DB: ${JSON.stringify(data)}`);
  }

  generateReport(): string {
    return `Total orders: ${this.orders.length}`;
  }

  // ❌ OCP: для нового типу знижки треба редагувати цей метод
  calculateDiscount(price: number, type: string): number {
    if (type === "regular") return price * 0.05;
    else if (type === "vip") return price * 0.15;
    else if (type === "employee") return price * 0.30;
    return 0;
  }
}

class Order {
  constructor(
    public id: number,
    public price: number,
    public customerEmail: string,
    public customerType: string
  ) {}

  getDescription(): string { return `Order #${this.id}, price: ${this.price}`; }
  getTotalPrice(): number { return this.price; }
}

// ❌ LSP: кидає виняток — порушує контракт базового класу
class PremiumOrder extends Order {
  getTotalPrice(): number {
    if (this.price < 100) throw new Error("Premium orders must be at least 100");
    return this.price * 0.85;
  }
}

// ❌ DIP: жорстка залежність від конкретного класу
class CheckoutController {
  private orderService = new OrderService();
  checkout(order: any): void { this.orderService.processOrder(order); }
}

export { OrderService, Order, PremiumOrder, CheckoutController, IWorker };
