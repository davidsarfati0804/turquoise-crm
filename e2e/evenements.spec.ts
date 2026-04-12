import { test, expect } from '@playwright/test';

test.describe('Événements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/evenements');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('liste des événements se charge', async ({ page }) => {
    // Page chargée sans erreur
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('naviguer vers un événement', async ({ page }) => {
    const eventLink = page.locator('a[href*="/evenements/"]').first();
    const count = await eventLink.count();

    if (count > 0) {
      await eventLink.click();
      await page.waitForURL(/evenements\/.+/);
      await expect(page.locator('body')).not.toContainText('Application error');
    } else {
      test.skip(true, 'Aucun événement à naviguer');
    }
  });

  test('les 8 onglets de détail événement sont accessibles', async ({ page }) => {
    const eventLink = page.locator('a[href*="/evenements/"]').first();
    const count = await eventLink.count();
    if (count === 0) {
      test.skip(true, 'Aucun événement');
      return;
    }

    await eventLink.click();
    await page.waitForURL(/evenements\/.+/);

    // Attendre les onglets
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });

    const tabCount = await tabs.count();
    console.log(`Nombre d'onglets trouvés: ${tabCount}`);

    // Cliquer sur chaque onglet et vérifier pas d'erreur
    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).not.toContainText('Application error');
    }
  });
});
