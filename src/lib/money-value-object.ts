export class Money {
  private readonly valueInCents: number;
  private readonly currency: string;

  constructor(
    value: string | number | Money,
    currency: string,
    options: { isCents?: boolean } = {},
  ) {
    const { isCents = false } = options;
    if (value instanceof Money) {
      if (value.currency !== currency.toUpperCase()) {
        throw new Error(
          'Cannot create Money instance with different currencies',
        );
      }
      this.valueInCents = value.getInCents();
      this.currency = currency.toUpperCase();
    } else {
      const parsedValue = this.parseToNumber(value);
      this.valueInCents = isCents
        ? Math.round(parsedValue)
        : Math.round(parsedValue * 100);
      this.currency = currency.toUpperCase();
    }
  }

  private parseToNumber(value: string | number): number {
    const parsed = parseFloat(value.toString().replace(/,/g, '.'));
    if (isNaN(parsed)) {
      throw new Error(`Invalid monetary value: ${value}`);
    }
    return parsed;
  }

  getInCents(): number {
    return this.valueInCents;
  }

  getAmount(): number {
    return this.valueInCents / 100;
  }

  getCurrency(): string {
    return this.currency;
  }

  format(): string {
    const amount = this.getAmount();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  add(amount: Money): Money {
    if (this.currency !== amount.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return new Money(this.valueInCents + amount.getInCents(), this.currency, {
      isCents: true,
    });
  }

  subtract(amount: Money): Money {
    if (this.currency !== amount.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    return new Money(this.valueInCents - amount.getInCents(), this.currency, {
      isCents: true,
    });
  }

  multiply(multiplier: number): Money {
    const multipliedValue = Math.round(this.valueInCents * multiplier);
    return new Money(multipliedValue, this.currency, { isCents: true });
  }

  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    const dividedValue = Math.round(this.valueInCents / divisor);
    return new Money(dividedValue, this.currency, { isCents: true });
  }

  percentage(percentage: number): Money {
    return this.multiply(percentage / 100);
  }

  isEqualTo(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare money with different currencies');
    }
    return this.valueInCents === other.getInCents();
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare money with different currencies');
    }
    return this.valueInCents > other.getInCents();
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare money with different currencies');
    }
    return this.valueInCents < other.getInCents();
  }

  isZero(): boolean {
    return this.valueInCents === 0;
  }

  isPositive(): boolean {
    return this.valueInCents > 0;
  }

  isNegative(): boolean {
    return this.valueInCents < 0;
  }

  abs(): Money {
    return new Money(Math.abs(this.valueInCents), this.currency, {
      isCents: true,
    });
  }

  round(): Money {
    return new Money(Math.round(this.valueInCents / 100) * 100, this.currency, {
      isCents: true,
    });
  }
}
