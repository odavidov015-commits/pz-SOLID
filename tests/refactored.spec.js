/**
 * UNIT TESTS — перевірка рефакторингу SOLID
 */

const {
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
} = require("../src/refactored/OrderService.js");

// ─────────────────────────────────────────────
// SRP — кожен клас тестується окремо
// ─────────────────────────────────────────────
describe("SRP — Single Responsibility Principle", () => {
  describe("EmailNotifier", () => {
    it("повинен надсилати email без побічних ефектів", () => {
      const notifier = new EmailNotifier();
      const spy = jest.spyOn(console, "log").mockImplementation(() => {});
      notifier.send("test@example.com", "Hello");
      expect(spy).toHaveBeenCalledWith("[Email] → test@example.com: Hello");
      spy.mockRestore();
    });
  });

  describe("InMemoryOrderRepository", () => {
    it("повинен зберігати та повертати замовлення", () => {
      const repo = new InMemoryOrderRepository();
      const order = { id: 1, price: 200, customerEmail: "a@b.com", customerType: "regular", finalPrice: 190 };
      repo.save(order);
      expect(repo.findAll()).toHaveLength(1);
      expect(repo.findAll()[0].id).toBe(1);
    });

    it("повинен повертати копію масиву, а не оригінал", () => {
      const repo = new InMemoryOrderRepository();
      const all = repo.findAll();
      all.push({ id: 99, price: 0, customerEmail: "", customerType: "" });
      expect(repo.findAll()).toHaveLength(0);
    });
  });

  describe("OrderReportService", () => {
    it("повинен генерувати звіт по збережених замовленнях", () => {
      const repo = new InMemoryOrderRepository();
      repo.save({ id: 1, price: 100, customerEmail: "", customerType: "", finalPrice: 95 });
      repo.save({ id: 2, price: 200, customerEmail: "", customerType: "", finalPrice: 170 });
      const report = new OrderReportService(repo);
      const result = report.generateReport();
      expect(result).toContain("Total orders: 2");
      expect(result).toContain("265");
    });
  });
});

// ─────────────────────────────────────────────
// OCP — нові знижки без зміни існуючих класів
// ─────────────────────────────────────────────
describe("OCP — Open/Closed Principle", () => {
  it("RegularDiscount розраховує 5%", () => {
    expect(new RegularDiscount().calculate(100)).toBe(5);
  });

  it("VipDiscount розраховує 15%", () => {
    expect(new VipDiscount().calculate(100)).toBe(15);
  });

  it("EmployeeDiscount розраховує 30%", () => {
    expect(new EmployeeDiscount().calculate(100)).toBe(30);
  });

  it("SeasonalDiscount розраховує 20% (нова знижка без зміни коду)", () => {
    expect(new SeasonalDiscount().calculate(100)).toBe(20);
  });

  it("DiscountFactory повертає нульову знижку для невідомого типу", () => {
    const strategy = DiscountFactory.getStrategy("unknown");
    expect(strategy.calculate(100)).toBe(0);
  });

  it("DiscountFactory повертає правильну стратегію для vip", () => {
    const strategy = DiscountFactory.getStrategy("vip");
    expect(strategy.calculate(200)).toBe(30);
  });
});

// ─────────────────────────────────────────────
// LSP — ValidatedOrder замінює Order без порушення контракту
// ─────────────────────────────────────────────
describe("LSP — Liskov Substitution Principle", () => {
  // Функція, що приймає базовий клас Order
  function printTotalPrice(order) {
    // ✅ завжди повертає number — ніколи не кидає виняток
    return order.getTotalPrice();
  }

  it("Order.getTotalPrice() повертає ціну", () => {
    const order = new Order(1, 150, "a@b.com", "regular");
    expect(printTotalPrice(order)).toBe(150);
  });

  it("ValidatedOrder.getTotalPrice() повертає 0 для малої ціни (не кидає виняток)", () => {
    const order = new ValidatedOrder(2, 50, "a@b.com", "vip");
    // ✅ LSP: не кидає, а повертає 0
    expect(() => printTotalPrice(order)).not.toThrow();
    expect(printTotalPrice(order)).toBe(0);
  });

  it("ValidatedOrder.getTotalPrice() повертає 85% для великої ціни", () => {
    const order = new ValidatedOrder(3, 200, "a@b.com", "vip");
    expect(printTotalPrice(order)).toBe(170);
  });

  it("ValidatedOrder може замінити Order скрізь (поліморфізм)", () => {
    const orders = [
      new Order(1, 100, "a@b.com", "regular"),
      new ValidatedOrder(2, 200, "b@c.com", "vip"),
    ];
    // ✅ обидва працюють однаково — getTotalPrice() завжди number
    const totals = orders.map(printTotalPrice);
    expect(totals).toEqual([100, 170]);
  });
});

// ─────────────────────────────────────────────
// ISP — інтерфейси невеликі та специфічні
// ─────────────────────────────────────────────
describe("ISP — Interface Segregation Principle", () => {
  it("EmailNotifier реалізує лише INotifier (метод send)", () => {
    const notifier = new EmailNotifier();
    expect(typeof notifier.send).toBe("function");
    expect(notifier.saveToDatabase).toBeUndefined();
    expect(notifier.generateReport).toBeUndefined();
  });

  it("InMemoryOrderRepository реалізує лише IOrderRepository (save, findAll)", () => {
    const repo = new InMemoryOrderRepository();
    expect(typeof repo.save).toBe("function");
    expect(typeof repo.findAll).toBe("function");
    expect(repo.send).toBeUndefined();
    expect(repo.generateReport).toBeUndefined();
  });

  it("OrderReportService реалізує лише IReportService (generateReport)", () => {
    const repo = new InMemoryOrderRepository();
    const reportService = new OrderReportService(repo);
    expect(typeof reportService.generateReport).toBe("function");
    expect(reportService.send).toBeUndefined();
    expect(reportService.save).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// DIP — залежності через абстракції
// ─────────────────────────────────────────────
describe("DIP — Dependency Inversion Principle", () => {
  it("OrderProcessor приймає будь-який INotifier (mock)", () => {
    const mockNotifier = { send: jest.fn() };
    const mockRepo = { save: jest.fn(), findAll: jest.fn(() => []) };

    const processor = new OrderProcessor(mockRepo, mockNotifier);
    const order = { id: 1, price: 200, customerEmail: "x@y.com", customerType: "vip" };

    processor.processOrder(order);

    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(mockNotifier.send).toHaveBeenCalledWith("x@y.com", expect.stringContaining("confirmed"));
  });

  it("OrderProcessor правильно розраховує finalPrice через стратегію", () => {
    const mockNotifier = { send: jest.fn() };
    const mockRepo = { save: jest.fn(), findAll: jest.fn(() => []) };

    const processor = new OrderProcessor(mockRepo, mockNotifier);
    const order = { id: 2, price: 100, customerEmail: "a@b.com", customerType: "regular" };

    processor.processOrder(order);

    // regular = 5% знижка → 100 - 5 = 95
    expect(order.finalPrice).toBe(95);
  });

  it("CheckoutController приймає будь-який IOrderProcessor (mock)", () => {
    const mockProcessor = { processOrder: jest.fn() };
    const controller = new CheckoutController(mockProcessor);
    const order = { id: 3, price: 300, customerEmail: "z@z.com", customerType: "employee" };

    controller.checkout(order);

    expect(mockProcessor.processOrder).toHaveBeenCalledWith(order);
  });

  it("можна підмінити EmailNotifier на SmsNotifier без зміни OrderProcessor", () => {
    const smsNotifier = new SmsNotifier();
    const repo = new InMemoryOrderRepository();
    const processor = new OrderProcessor(repo, smsNotifier);

    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const order = { id: 4, price: 150, customerEmail: "tel:+380", customerType: "vip" };
    processor.processOrder(order);

    // SMS надісланий, не email — залежність легко замінюється
    expect(order.finalPrice).toBe(127.5);
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────
// Інтеграційний тест — повний цикл
// ─────────────────────────────────────────────
describe("Integration — повний цикл замовлення", () => {
  it("замовлення обробляється, зберігається та підтверджується", () => {
    const repo = new InMemoryOrderRepository();
    const notifier = new EmailNotifier();
    const processor = new OrderProcessor(repo, notifier);
    const controller = new CheckoutController(processor);

    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    const order = { id: 10, price: 500, customerEmail: "client@shop.com", customerType: "vip" };
    controller.checkout(order);

    // finalPrice = 500 - 15% = 425
    expect(order.finalPrice).toBe(425);
    expect(repo.findAll()).toHaveLength(1);

    const report = new OrderReportService(repo).generateReport();
    expect(report).toContain("Total orders: 1");
    expect(report).toContain("425");

    spy.mockRestore();
  });
});
