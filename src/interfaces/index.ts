/**
 * INTERFACES — абстракції для DIP та ISP
 *
 * ISP: кожен інтерфейс — одна відповідальність
 * DIP: залежності реалізуються через ці інтерфейси
 */

// ✅ ISP: окремий інтерфейс для відправки повідомлень
export interface INotifier {
  send(to: string, message: string): void;
}

// ✅ ISP: окремий інтерфейс для збереження даних
export interface IOrderRepository {
  save(order: IOrder): void;
  findAll(): IOrder[];
}

// ✅ ISP: окремий інтерфейс для генерації звітів
export interface IReportService {
  generateReport(): string;
}

// ✅ ISP: окремий інтерфейс для розрахунку знижок
export interface IDiscountStrategy {
  calculate(price: number): number;
}

// ✅ ISP: окремий інтерфейс для обробки замовлення
export interface IOrderProcessor {
  processOrder(order: IOrder): void;
}

// Модель замовлення
export interface IOrder {
  id: number;
  price: number;
  customerEmail: string;
  customerType: string;
  finalPrice?: number;
}
