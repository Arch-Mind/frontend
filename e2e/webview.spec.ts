import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('ArchMind Webview E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Mock VS Code API before each test
        await page.addInitScript(() => {
            (window as any).acquireVsCodeApi = () => ({
                postMessage: () => { },
                getState: () => ({}),
                setState: () => ({})
            });
        });
    });

    test('should load the application root', async ({ page }) => {
        const htmlPath = path.resolve(__dirname, '../out/webview/index.html');
        await page.goto(`file://${htmlPath}`);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });
    });

    test('should show loading state', async ({ page }) => {
        const htmlPath = path.resolve(__dirname, '../out/webview/index.html');
        await page.goto(`file://${htmlPath}`);

        const root = page.locator('#root');
        await expect(root).toBeVisible({ timeout: 15000 });

        // Check if the app is rendering something inside root
        const content = page.locator('#root > *');
        await expect(content).toBeDefined();
    });
});
