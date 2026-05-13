# PZ-SOLID — Практична реалізація SOLID принципів

## 🎯 Предметна область

**Система обробки замовлень інтернет-магазину** — TypeScript-реалізація з навмисними порушеннями SOLID та подальшим рефакторингом.

---

## 📁 Структура проєкту

```
pz-SOLID/
├── src/
│   ├── original/
│   │   └── OrderService.ts      # анти-SOLID код із порушеннями
│   ├── refactored/
│   │   └── OrderService.ts      # код після рефакторингу
│   └── interfaces/
│       └── index.ts             # абстракції та інтерфейси
├── tests/
│   └── refactored.spec.js       # unit-тести
├── jest.config.js
├── tsconfig.json
├── package.json
├── .editorconfig
├── .gitignore
└── README.md
```

---

## 🔍 Аналіз вихідного коду — знайдені порушення

### ❌ SRP — Single Responsibility Principle
**Клас `OrderService`** виконує п'ять різних обов'язків одночасно:
1. Обробка бізнес-логіки замовлення
2. Відправка email (`sendEmail`)
3. Збереження до бази даних (`saveToDatabase`)
4. Генерація звітів (`generateReport`)
5. Розрахунок знижок (`calculateDiscount`)

**Наслідок:** будь-яка зміна (наприклад, зміна SMTP-провайдера) вимагає редагування `OrderService`, що може зламати решту функціоналу.

---

### ❌ OCP — Open/Closed Principle
Метод `calculateDiscount` використовує ланцюжок `if/else if`:
```typescript
if (type === "regular") { return price * 0.05; }
else if (type === "vip") { return price * 0.15; }
else if (type === "employee") { return price * 0.30; }
// для нового типу — треба редагувати існуючий метод ❌
```
**Наслідок:** додавання нового типу знижки вимагає зміни існуючого класу, що порушує принцип "закритий для модифікації".

---

### ❌ LSP — Liskov Substitution Principle
`PremiumOrder` розширює `Order`, але **порушує контракт** базового класу:
```typescript
// Order.getTotalPrice() — завжди повертає number
// PremiumOrder.getTotalPrice() — може кинути виняток ❌
getTotalPrice(): number {
  if (this.price < 100) {
    throw new Error("Premium orders must be at least 100"); // ❌
  }
  return this.price * 0.85;
}
```
**Наслідок:** код, що очікує `Order`, може несподівано отримати виняток при роботі з `PremiumOrder`.

---

### ❌ ISP — Interface Segregation Principle
Один великий інтерфейс `IWorker` змушує реалізовувати **всі** методи:
```typescript
interface IWorker {
  processOrder(order: any): void;
  sendEmail(to: string, message: string): void;    // ❌ не потрібен репозиторію
  saveToDatabase(data: any): void;                  // ❌ не потрібен email-сервісу
  generateReport(): string;                         // ❌ не потрібен процесору
  calculateDiscount(price: number, type: string): number;
}
```
**Наслідок:** клас, що реалізує `IWorker` лише для email, змушений реалізувати `saveToDatabase` та `generateReport`.

---

### ❌ DIP — Dependency Inversion Principle
`CheckoutController` жорстко залежить від конкретного класу:
```typescript
class CheckoutController {
  private orderService = new OrderService(); // ❌ конкретний клас, не абстракція
}
```
**Наслідок:** неможливо замінити `OrderService` на mock у тестах або на альтернативну реалізацію без зміни `CheckoutController`.

---

## ✅ Рефакторинг — застосовані принципи

### ✅ SRP — Single Responsibility Principle

Кожен клас має одну відповідальність:

| Клас | Відповідальність |
|---|---|
| `EmailNotifier` | лише відправка email |
| `SmsNotifier` | лише відправка SMS |
| `InMemoryOrderRepository` | лише збереження замовлень |
| `OrderReportService` | лише генерація звітів |
| `OrderProcessor` | лише бізнес-логіка обробки |
| `CheckoutController` | лише координація checkout |

```typescript
// ✅ EmailNotifier — одна відповідальність
export class EmailNotifier implements INotifier {
  send(to: string, message: string): void {
    console.log(`[Email] → ${to}: ${message}`);
  }
}
```

---

### ✅ OCP — Open/Closed Principle

Патерн **Strategy**: нова знижка — новий клас, без зміни існуючих.

```typescript
// ✅ нова знижка — новий клас, не зміна коду
export class SeasonalDiscount implements IDiscountStrategy {
  calculate(price: number): number { return price * 0.20; }
}

// ✅ DiscountFactory підбирає стратегію
export class DiscountFactory {
  private static strategies: Record<string, IDiscountStrategy> = {
    regular: new RegularDiscount(),
    vip: new VipDiscount(),
    seasonal: new SeasonalDiscount(), // ✅ просто додати сюди
  };
}
```

---

### ✅ LSP — Liskov Substitution Principle

`ValidatedOrder` замінює `Order` скрізь без порушення контракту:

```typescript
// ✅ не кидає виняток — повертає 0 і попереджає
export class ValidatedOrder extends Order {
  getTotalPrice(): number {
    if (this.price < 100) {
      console.warn(`[ValidatedOrder] price below minimum. Returning 0.`);
      return 0; // ✅ завжди number, ніколи не throw
    }
    return this.price * 0.85;
  }
}

// ✅ функція працює з Order та ValidatedOrder однаково
function printTotalPrice(order: Order): number {
  return order.getTotalPrice(); // ніколи не отримає виняток
}
```

---

### ✅ ISP — Interface Segregation Principle

П'ять невеликих інтерфейсів замість одного великого:

```typescript
export interface INotifier {
  send(to: string, message: string): void;
}
export interface IOrderRepository {
  save(order: IOrder): void;
  findAll(): IOrder[];
}
export interface IReportService {
  generateReport(): string;
}
export interface IDiscountStrategy {
  calculate(price: number): number;
}
export interface IOrderProcessor {
  processOrder(order: IOrder): void;
}
```

---

### ✅ DIP — Dependency Inversion Principle

`OrderProcessor` та `CheckoutController` залежать від інтерфейсів:

```typescript
// ✅ залежить від IOrderRepository та INotifier — абстракцій
export class OrderProcessor implements IOrderProcessor {
  constructor(
    private repository: IOrderRepository, // ✅ не InMemoryOrderRepository
    private notifier: INotifier,           // ✅ не EmailNotifier
  ) {}
}

// ✅ залежить від IOrderProcessor — абстракції
export class CheckoutController {
  constructor(private processor: IOrderProcessor) {}
}
```

**Приклад композиції (Dependency Injection):**
```typescript
const repo = new InMemoryOrderRepository();
const notifier = new EmailNotifier();           // або SmsNotifier — без зміни коду!
const processor = new OrderProcessor(repo, notifier);
const controller = new CheckoutController(processor);
```

---

## 🧪 Запуск тестів

```bash
npm install
npm test
```

### Результат тестів

```
SRP — Single Responsibility Principle
  EmailNotifier
    ✓ повинен надсилати email без побічних ефектів
  InMemoryOrderRepository
    ✓ повинен зберігати та повертати замовлення
    ✓ повинен повертати копію масиву, а не оригінал
  OrderReportService
    ✓ повинен генерувати звіт по збережених замовленнях

OCP — Open/Closed Principle
  ✓ RegularDiscount розраховує 5%
  ✓ VipDiscount розраховує 15%
  ✓ EmployeeDiscount розраховує 30%
  ✓ SeasonalDiscount розраховує 20% (нова знижка без зміни коду)
  ✓ DiscountFactory повертає нульову знижку для невідомого типу
  ✓ DiscountFactory повертає правильну стратегію для vip

LSP — Liskov Substitution Principle
  ✓ Order.getTotalPrice() повертає ціну
  ✓ ValidatedOrder.getTotalPrice() повертає 0 для малої ціни (не кидає виняток)
  ✓ ValidatedOrder.getTotalPrice() повертає 85% для великої ціни
  ✓ ValidatedOrder може замінити Order скрізь (поліморфізм)

ISP — Interface Segregation Principle
  ✓ EmailNotifier реалізує лише INotifier (метод send)
  ✓ InMemoryOrderRepository реалізує лише IOrderRepository (save, findAll)
  ✓ OrderReportService реалізує лише IReportService (generateReport)

DIP — Dependency Inversion Principle
  ✓ OrderProcessor приймає будь-який INotifier (mock)
  ✓ OrderProcessor правильно розраховує finalPrice через стратегію
  ✓ CheckoutController приймає будь-який IOrderProcessor (mock)
  ✓ можна підмінити EmailNotifier на SmsNotifier без зміни OrderProcessor

Integration — повний цикл замовлення
  ✓ замовлення обробляється, зберігається та підтверджується

Tests: 21 passed
```

---

## 📊 Порівняння: до та після рефакторингу

| Аспект | До (анти-SOLID) | Після (SOLID) |
|---|---|---|
| Кількість класів | 3 | 10 |
| Кількість інтерфейсів | 1 (великий) | 5 (специфічних) |
| Додавання нової знижки | зміна існуючого методу | новий клас |
| Тестування | неможливо mock-нути залежності | повний mock через DIP |
| Заміна email на SMS | зміна OrderService | зміна одного параметра |
| LSP сумісність | порушена (throw) | дотримана (return 0) |

---

## 📚 Висновки

В ході практичного заняття проаналізовано вихідний анти-SOLID код та виконано повний рефакторинг:

- **SRP**: `OrderService` розбито на 6 спеціалізованих класів
- **OCP**: патерн Strategy замінив `if/else` для знижок — нові типи додаються без зміни існуючого коду
- **LSP**: `ValidatedOrder` замінює `Order` скрізь без порушення контракту
- **ISP**: один великий `IWorker` замінено п'ятьма специфічними інтерфейсами
- **DIP**: `OrderProcessor` та `CheckoutController` залежать від абстракцій, що дозволяє легке тестування та заміну реалізацій
- **21 тест** проходить успішно, покриваючи кожен принцип окремо та інтеграційний сценарій
