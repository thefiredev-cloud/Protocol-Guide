/**
 * Email templates index
 * Exports all email template render functions
 */

// Placeholder templates - will be replaced with React Email templates
// Each function receives data and returns rendered HTML string

export async function welcome(data: Record<string, unknown>): Promise<string> {
  const name = (data.name as string) || 'there';
  return `
    <html>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>Welcome to Protocol Guide!</h1>
        <p>Hi ${name},</p>
        <p>Thanks for signing up. You now have access to fast, accurate EMS protocol lookups.</p>
        <p>— The Protocol Guide Team</p>
      </body>
    </html>
  `;
}

export async function tierUpgrade(data: Record<string, unknown>): Promise<string> {
  const name = (data.name as string) || 'there';
  const tier = (data.tier as string) || 'Pro';
  return `
    <html>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>Welcome to Protocol Guide ${tier}!</h1>
        <p>Hi ${name},</p>
        <p>Your upgrade is complete. You now have unlimited searches and offline access.</p>
        <p>— The Protocol Guide Team</p>
      </body>
    </html>
  `;
}

export async function subscriptionCanceled(data: Record<string, unknown>): Promise<string> {
  const name = (data.name as string) || 'there';
  const endDate = (data.endDate as string) || 'soon';
  return `
    <html>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>We're sorry to see you go</h1>
        <p>Hi ${name},</p>
        <p>Your Pro subscription has been canceled. You'll have Pro access until ${endDate}.</p>
        <p>— The Protocol Guide Team</p>
      </body>
    </html>
  `;
}

export async function onboardingTips(data: Record<string, unknown>): Promise<string> {
  const name = (data.name as string) || 'there';
  return `
    <html>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>Getting the most out of Protocol Guide</h1>
        <p>Hi ${name},</p>
        <p>Here are some tips:</p>
        <ul>
          <li>Use voice search when wearing gloves</li>
          <li>Save frequently-used protocols as favorites</li>
          <li>Ask follow-up questions for clarification</li>
        </ul>
        <p>— The Protocol Guide Team</p>
      </body>
    </html>
  `;
}

export async function onboardingProPitch(data: Record<string, unknown>): Promise<string> {
  const name = (data.name as string) || 'there';
  const queriesUsed = (data.queriesUsed as number) || 0;
  return `
    <html>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>Unlock Unlimited Searches</h1>
        <p>Hi ${name},</p>
        <p>You've made ${queriesUsed} searches this week. Upgrade to Pro for unlimited access.</p>
        <p>— The Protocol Guide Team</p>
      </body>
    </html>
  `;
}
