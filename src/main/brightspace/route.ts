export default class Route {
  private static readonly BASE: string =
    "https://brightspace.algonquincollege.com";

  public method: string;
  public path: string;
  public url: string;

  constructor(method: string, path: string, parameters?: Record<string, any>) {
    this.method = method;
    this.path = path;

    if (parameters) {
      this.url = Route.BASE + this.format(path, parameters);
    } else {
      this.url = Route.BASE + path;
    }
  }

  private format(path: string, params: Record<string, any>): string {
    return path.replace(/{(.*?)}/g, (_, key) => {
      if (!(key in params)) {
        throw new Error(`Missing parameter: ${key}`);
      }
      return encodeURIComponent(params[key]);
    });
  }
}
