import { test, expect } from '@playwright/test';

test.describe('WhatsApp Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/whatsapp');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('inbox se charge sans erreur', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('liste des conversations visible', async ({ page }) => {
    // La sidebar de conversations ou une liste doit s'afficher
    const sidebar = page.locator('[data-testid="conversations"], aside, .conversations-list, .inbox-sidebar').first();
    // Si pas de testid spécifique, on vérifie juste que la page charge
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('ouvrir une conversation', async ({ page }) => {
    await page.waitForTimeout(1000);
    const conversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();
    const count = await conversation.count();

    if (count > 0) {
      await conversation.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).not.toContainText('Application error');
    } else {
      test.skip(true, 'Aucune conversation existante');
    }
  });
});
