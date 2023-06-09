import { ChildProcess, spawn } from "child_process";
import http, { Server } from "http";
import path from "path";
import { app, ports } from "./app";

export class TestServerWdioService {
  private angular?: ChildProcess;
  private express?: Server[] = [];

  public async onPrepare(): Promise<void> {
    await this.startAngular();
    await this.startExpress();
    process.on("exit", () => this.onComplete());
  }

  public async onComplete(): Promise<void> {
    await this.stopExpress();
    await this.stopAngular();
  }

  private async startAngular(): Promise<void> {
    const cwd = path.join(__dirname, "angular");
    const ng = path.join(__dirname, "../../node_modules/@angular/cli/bin/ng");

    this.angular = spawn("node", [ng, "serve", "--disable-host-check"], { cwd });

    await new Promise<void>((resolve, reject) => {
      this.angular.stdout.on("data", data => {
        process.stdout.write(data);
        const s = data.toString();
        if (s.includes("Compiled successfully")) {
          resolve();
        } else if (s.includes("Failed to compile")) {
          this.stopAngular();
          reject();
        }
      });
      this.angular.stderr.on("data", data => {
        process.stderr.write(data);
        if (data.toString().includes("An unhandled exception occurred")) {
          this.stopAngular();
          reject();
        }
      });
    });
  }

  private async stopAngular(): Promise<void> {
    if (this.angular) {
      this.angular.kill();
      this.angular = null;
    }
  }

  private async startExpress(): Promise<void> {
    await Promise.all(ports.map((port, i) => new Promise<void>(resolve => {
      this.express[i] = http.createServer(app).listen(port, () => {
        console.log(`App listening on http://localhost:${port}`);
        resolve();
      });
    })));
  }

  private async stopExpress(): Promise<void> {
    await Promise.all(this.express.map(app => new Promise<void>(resolve => {
      app.close(() => resolve());
    })));
  }
}
