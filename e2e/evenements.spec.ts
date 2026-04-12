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
    const eventLink = page.locator('a[href*="/evenements/"]:not([href*="/nouveau"]):not([href*="/modifier"])').first();
    const count = await eventLink.count();

    if (count > 0) {
      await eventLink.click();
      await page.waitForURL(/evenements\/.+/);
      await expect(page.locator('body')).not.toContainText('Application error');
    } else {
      test.skip(true, 'Aucun événement à naviguer');
    }
  });

  test('les onglets de détail événement sont accessibles', async ({ page }) => {
    // Exclure les liens /nouveau et /modifier — on veut un vrai événement existant
    const eventLink = page.locator('a[href*="/evenements/"]:not([href*="/nouveau"]):not([href*="/modifier"])').first();
    const count = await eventLink.count();
    if (count === 0) {
      test.skip(true, 'Aucun événement');
      return;
    }

    await eventLink.click();
    await page.waitForURL(/evenements\/.+/);

    // Les onglets sont des <button> dans <nav aria-label="Tabs">, pas role="tab"
    // On attend que React hydrate le composant client EventTabs
    await page.waitForSelector('nav[aria-label="Tabs"] button', { timeout: 15000 });
    const tabs = page.locator('nav[aria-label="Tabs"] button');
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });

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
