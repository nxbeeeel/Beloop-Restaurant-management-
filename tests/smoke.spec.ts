
import { test, expect } from '@playwright/test';

test('homepage has title/meta', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Beloop/);

    // Verify main text or login button presence if unauthenticated
    // Assuming default redirects to login or has a landing page
    // Adjust this selector based on your actual unauth page
    const main = page.locator('body');
    await expect(main).toBeVisible();
});
