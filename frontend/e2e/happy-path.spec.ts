import { expect, test } from '@playwright/test'

// End-to-end happy path mirroring the backend's own
// test/integration/product_builder_flow_test.rb. Requires a live Rails API
// (with a reachable Postgres) at VITE_API_BASE_URL — see plan.md's Risks.
//
// Deliberately does NOT assert on the agent's reply content: that would
// require a real OpenAI call, which is slow, flaky, and costs money per run.
// It only asserts the user's own message and the "waiting for the agent"
// pending state.

function unique(label: string) {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

test('register, build a product with two stages, run two independent projects, chat, and share', async ({
  page,
}) => {
  const email = `${unique('owner')}@example.com`
  const password = 'password123'

  await page.goto('/register')
  await page.getByLabel('First name').fill('Flow')
  await page.getByLabel('Surname').fill('Owner')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()

  await page.getByRole('button', { name: 'New product' }).click()
  await page.getByLabel('Name').fill('Menopause Guide')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.getByText('Menopause Guide').click()

  await expect(page.getByRole('heading', { name: 'Menopause Guide' })).toBeVisible()

  await page.getByRole('button', { name: 'Add stage' }).click()
  await page.getByLabel('Name').fill('Copy')
  await page.getByLabel('Initial prompt').fill('Write persuasive copy.')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Copy', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Add stage' }).click()
  await page.getByLabel('Name').fill('Landing Page')
  await page.getByLabel('Initial prompt').fill('Build a landing page.')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Landing Page')).toBeVisible()

  // Two independent projects (Scenario 6/7)
  await page.getByRole('button', { name: 'Start project' }).click()
  await expect(page).toHaveURL(/\/products\/.+\/projects\/.+/)
  const projectAUrl = page.url()

  await page.goBack()
  await page.getByRole('button', { name: 'Start project' }).click()
  await expect(page).toHaveURL(/\/products\/.+\/projects\/.+/)
  const projectBUrl = page.url()
  expect(projectAUrl).not.toBe(projectBUrl)

  // Chat on project A's first stage (Scenario 8)
  await page.goto(projectAUrl)
  await page.getByRole('link', { name: 'Copy' }).click()
  await page.getByLabel('Message').fill('Make it about hot flashes specifically.')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('Make it about hot flashes specifically.')).toBeVisible()
  await expect(page.getByText(/waiting for the agent/i)).toBeVisible()

  // Project B is untouched (Scenario 7)
  await page.goto(projectBUrl)
  await expect(page.getByText('pending').first()).toBeVisible()
  await expect(page.getByText('running')).toHaveCount(0)

  // Share with a second, already-registered user (Scenario 10, 12)
  const collaboratorEmail = `${unique('viewer')}@example.com`
  const context2 = await page.context().browser()!.newContext()
  const page2 = await context2.newPage()
  await page2.goto('/register')
  await page2.getByLabel('First name').fill('Second')
  await page2.getByLabel('Surname').fill('User')
  await page2.getByLabel('Email').fill(collaboratorEmail)
  await page2.getByLabel('Password').fill(password)
  await page2.getByRole('button', { name: 'Register' }).click()
  await expect(page2.getByRole('heading', { name: 'Products' })).toBeVisible()
  await page2.close()
  await context2.close()

  await page.goto(projectAUrl.replace(/\/projects\/.+/, ''))
  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByLabel('Email').fill(collaboratorEmail)
  await page.getByRole('button', { name: 'Share' }).click()
  await expect(page.getByText(collaboratorEmail)).toBeVisible()

  // Second user sees the product read-only (Scenario 12, FR-18)
  const context3 = await page.context().browser()!.newContext()
  const page3 = await context3.newPage()
  await page3.goto('/login')
  await page3.getByLabel('Email').fill(collaboratorEmail)
  await page3.getByLabel('Password').fill(password)
  await page3.getByRole('button', { name: 'Log in' }).click()
  await page3.getByText('Menopause Guide').click()

  await expect(page3.getByRole('heading', { name: 'Menopause Guide' })).toBeVisible()
  await expect(page3.getByRole('button', { name: 'Add stage' })).toHaveCount(0)
  await expect(page3.getByRole('button', { name: 'Start project' })).toHaveCount(0)
  await expect(page3.getByRole('button', { name: 'Share' })).toHaveCount(0)
  await expect(page3.getByRole('button', { name: 'Delete product' })).toHaveCount(0)

  await context3.close()
})
