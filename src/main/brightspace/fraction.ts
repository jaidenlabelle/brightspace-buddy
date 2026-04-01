export class Fraction {
  constructor(
    public numerator: number,
    public denominator: number
  ) {}

  static fromString(fractionStr: string): Fraction {
    try {
      const [numStr, denomStr] = fractionStr.split("/");

      const numerator = Number(numStr.trim());
      const denominator = Number(denomStr.trim());

      if (Number.isNaN(numerator) || Number.isNaN(denominator)) {
        throw new Error();
      }

      return new Fraction(numerator, denominator);
    } catch {
      throw new Error(`Invalid fraction string: ${fractionStr}`);
    }
  }

  toDecimal(): number {
    if (this.denominator === 0) {
      throw new Error("Denominator cannot be zero.");
    }

    return this.numerator / this.denominator;
  }

  toString(): string {
    return `${this.numerator}/${this.denominator}`;
  }
}
