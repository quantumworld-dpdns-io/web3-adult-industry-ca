import { Page } from '@playwright/test';
export class LoginPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/login'); }
  async login(apiKey: string) {
    await this.page.fill('[data-testid="api-key-input"]', apiKey);
    await this.page.click('[data-testid="login-button"]');
  }
}
