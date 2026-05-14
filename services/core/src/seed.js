require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding GlobalTransact v2 database...');

  // ── 1. Demo Users (5 roles) ─────────────────────────────────────────────────
  const [clientHash, agentHash, adminHash, complianceHash, superHash, agentRwHash, agentGhHash] =
    await Promise.all([
      bcrypt.hash('Client@12345', 12),
      bcrypt.hash('Agent@12345',  12),
      bcrypt.hash('Admin@12345',  12),
      bcrypt.hash('Comply@12345', 12),
      bcrypt.hash('Super@12345',  12),
      bcrypt.hash('Agent@Kigali2024!', 12),
      bcrypt.hash('Agent@Accra2024!',  12),
    ]);

  const client = await prisma.user.upsert({
    where: { email: 'client@demo.com' },
    update: {},
    create: {
      email: 'client@demo.com',
      name: 'Alice Uwase',
      role: 'client',
      country: 'RW',
      msisdn: '+250780000001',
      passwordHash: clientHash,
    },
  });
  await prisma.clientWallet.upsert({
    where: { userId: client.id },
    update: {},
    create: { userId: client.id, currency: 'RWF', balance: 500000 },
  });
  console.log('✅ client@demo.com — Client@12345');

  const agent = await prisma.user.upsert({
    where: { email: 'agent@demo.com' },
    update: {},
    create: {
      email: 'agent@demo.com',
      name: 'John Agente',
      role: 'agent',
      country: 'RW',
      msisdn: '+250781000099',
      passwordHash: agentHash,
    },
  });
  for (const [currency, balance] of [['RWF', 10000000], ['GHS', 100000], ['USD', 5000]]) {
    await prisma.agentWallet.upsert({
      where: { agentId_currency: { agentId: agent.id, currency } },
      update: {},
      create: { agentId: agent.id, currency, balance },
    });
  }
  await prisma.agentProfile.upsert({
    where: { agentId: agent.id },
    update: {},
    create: {
      agentId: agent.id,
      commissionRate: 0.005,
      territory: 'Kigali, Rwanda',
      isVerified: true,
    },
  });
  console.log('✅ agent@demo.com — Agent@12345');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Admin User',
      role: 'admin',
      country: 'RW',
      passwordHash: adminHash,
    },
  });
  console.log('✅ admin@demo.com — Admin@12345');

  const compliance = await prisma.user.upsert({
    where: { email: 'compliance@demo.com' },
    update: {},
    create: {
      email: 'compliance@demo.com',
      name: 'Compliance Officer',
      role: 'compliance_officer',
      country: 'RW',
      passwordHash: complianceHash,
    },
  });
  console.log('✅ compliance@demo.com — Comply@12345');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@demo.com' },
    update: {},
    create: {
      email: 'superadmin@demo.com',
      name: 'Super Administrator',
      role: 'super_admin',
      country: 'RW',
      passwordHash: superHash,
    },
  });
  console.log('✅ superadmin@demo.com — Super@12345');

  // ── 2. Legacy agents (kept from v1) ────────────────────────────────────────
  const agentRW = await prisma.user.upsert({
    where: { email: 'agent.kigali@globaltransact.com' },
    update: {},
    create: {
      email: 'agent.kigali@globaltransact.com',
      name: 'Kigali Agent',
      role: 'agent',
      country: 'RW',
      msisdn: '+250781000001',
      passwordHash: agentRwHash,
    },
  });
  await prisma.agentWallet.upsert({
    where: { agentId_currency: { agentId: agentRW.id, currency: 'RWF' } },
    update: {},
    create: { agentId: agentRW.id, currency: 'RWF', balance: 5000000 },
  });
  await prisma.agentProfile.upsert({
    where: { agentId: agentRW.id },
    update: {},
    create: { agentId: agentRW.id, commissionRate: 0.005, territory: 'Kigali', isVerified: true },
  });

  const agentGH = await prisma.user.upsert({
    where: { email: 'agent.accra@globaltransact.com' },
    update: {},
    create: {
      email: 'agent.accra@globaltransact.com',
      name: 'Accra Agent',
      role: 'agent',
      country: 'GH',
      msisdn: '+233241000001',
      passwordHash: agentGhHash,
    },
  });
  await prisma.agentWallet.upsert({
    where: { agentId_currency: { agentId: agentGH.id, currency: 'GHS' } },
    update: {},
    create: { agentId: agentGH.id, currency: 'GHS', balance: 50000 },
  });
  await prisma.agentProfile.upsert({
    where: { agentId: agentGH.id },
    update: {},
    create: { agentId: agentGH.id, commissionRate: 0.005, territory: 'Accra', isVerified: true },
  });

  // ── 3. Legacy test client ───────────────────────────────────────────────────
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Uwase',
      role: 'client',
      country: 'RW',
      msisdn: '+250780000002',
      passwordHash: await bcrypt.hash('Client@Test2024!', 12),
    },
  });
  await prisma.clientWallet.upsert({
    where: { userId: alice.id },
    update: {},
    create: { userId: alice.id, currency: 'RWF', balance: 500000 },
  });

  // ── 4. Platform liquidity pools ─────────────────────────────────────────────
  const pools = [
    { currency: 'RWF', country: 'RW', type: 'collection', label: 'Rwanda Collection Pool', balance: 50000000, alertThreshold: 5000000 },
    { currency: 'GHS', country: 'GH', type: 'payout',     label: 'Ghana Payout Pool',      balance: 500000,   alertThreshold: 50000   },
    { currency: 'UGX', country: 'UG', type: 'payout',     label: 'Uganda Payout Pool',     balance: 100000000,alertThreshold: 10000000 },
    { currency: 'KES', country: 'KE', type: 'payout',     label: 'Kenya Payout Pool',      balance: 2000000,  alertThreshold: 200000  },
    { currency: 'USD', country: 'US', type: 'payout',     label: 'USD Settlement Pool',    balance: 100000,   alertThreshold: 10000   },
  ];
  for (const pool of pools) {
    await prisma.platformAccount.upsert({
      where: { currency: pool.currency },
      update: {},
      create: pool,
    });
    console.log(`✅ Pool: ${pool.currency} ${pool.balance.toLocaleString()}`);
  }

  // ── 5. Forex rates ───────────────────────────────────────────────────────────
  const rates = [
    { corridor: 'RWF_GHS', fromCcy: 'RWF', toCcy: 'GHS', midRate: 0.00088,  spreadPct: 0.025, clientRate: 0.000858  },
    { corridor: 'RWF_UGX', fromCcy: 'RWF', toCcy: 'UGX', midRate: 3.45,     spreadPct: 0.020, clientRate: 3.381    },
    { corridor: 'RWF_KES', fromCcy: 'RWF', toCcy: 'KES', midRate: 0.1286,   spreadPct: 0.022, clientRate: 0.1258   },
    { corridor: 'RWF_USD', fromCcy: 'RWF', toCcy: 'USD', midRate: 0.00072,  spreadPct: 0.030, clientRate: 0.000698 },
  ];
  for (const r of rates) {
    const existing = await prisma.forexRate.findFirst({ where: { corridor: r.corridor }, orderBy: { fetchedAt: 'desc' } });
    if (!existing) {
      await prisma.forexRate.create({ data: { ...r, fetchedAt: new Date() } });
      console.log(`✅ Rate: ${r.corridor}`);
    }
  }

  // ── 6. SystemConfig ──────────────────────────────────────────────────────────
  const configs = [
    { key: 'fraud.velocity.max_transfers_per_hour', value: '5',       category: 'fraud',  description: 'Max transfers per user per hour before velocity flag' },
    { key: 'fraud.large_tx.threshold_rwf',          value: '500000',  category: 'fraud',  description: 'Transfers above this RWF amount trigger large-TX flag' },
    { key: 'fraud.high_risk_countries',             value: JSON.stringify(['KP','IR','SY','MM','BY','CU']), category: 'fraud', description: 'ISO-2 country codes treated as high risk' },
    { key: 'tx.limit.client.daily_rwf',             value: '2000000', category: 'limits', description: 'Daily send limit per client in RWF' },
    { key: 'tx.limit.client.single_rwf',            value: '1000000', category: 'limits', description: 'Single transfer cap per client in RWF' },
    { key: 'tx.fee.flat_rwf',                       value: '500',     category: 'fees',   description: 'Flat fee in RWF applied to every transfer' },
    { key: 'tx.fee.pct',                            value: '0.01',    category: 'fees',   description: 'Percentage fee (decimal) applied to transfer amount' },
    { key: 'kyc.required',                          value: 'false',   category: 'kyc',    description: 'Require approved KYC before sending a transfer' },
    { key: 'kyc.auto_approve_demo',                 value: 'true',    category: 'kyc',    description: 'Auto-approve KYC submissions in demo/dev mode' },
    { key: 'agent.default_commission_rate',         value: '0.005',   category: 'general',description: 'Default commission rate for new agents (0.5%)' },
    { key: 'notification.otp_expiry_minutes',       value: '10',      category: 'notifications', description: 'OTP validity window in minutes' },
    { key: 'platform.maintenance_mode',             value: 'false',   category: 'general',description: 'Put platform into maintenance mode (blocks all transfers)' },
    { key: 'platform.support_email',                value: 'support@globaltransact.com', category: 'general', description: 'Support email shown in notifications' },
  ];
  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: { ...cfg, updatedBy: superAdmin.id },
    });
  }
  console.log(`✅ SystemConfig: ${configs.length} entries`);

  // ── 7. Demo KYC application (APPROVED) for client@demo.com ─────────────────
  await prisma.kycApplication.upsert({
    where: { userId: client.id },
    update: {},
    create: {
      userId:      client.id,
      status:      'APPROVED',
      reviewedBy:  compliance.id,
      reviewedAt:  new Date(),
      reviewNotes: 'Demo auto-approved for dev/test environment.',
      riskScore:   12,
      riskLevel:   'LOW',
    },
  });
  const existingDoc = await prisma.kycDocument.findFirst({ where: { userId: client.id } });
  if (!existingDoc) {
    await prisma.kycDocument.create({
      data: {
        userId:        client.id,
        type:          'national_id',
        fileName:      'national_id_demo.jpg',
        fileUrl:       'kyc/demo/national_id_demo.jpg',
        mimeType:      'image/jpeg',
        ocrData:       { name: 'Alice Uwase', dob: '1992-03-15', document_number: 'RW1234567', nationality: 'Rwandan' },
        faceMatchScore: 0.96,
        status:        'APPROVED',
      },
    });
  }
  console.log('✅ KYC: approved for client@demo.com');

  // ── 8. Demo beneficiary for client ─────────────────────────────────────────
  const existingBeneficiary = await prisma.beneficiary.findFirst({ where: { userId: client.id } });
  if (!existingBeneficiary) {
    await prisma.beneficiary.create({
      data: {
        userId:      client.id,
        nickname:    'Mom Ghana',
        fullName:    'Grace Mensah',
        msisdn:      '+233201234567',
        country:     'GH',
        currency:    'GHS',
        payoutMethod:'momo',
        isFavorite:  true,
      },
    });
  }
  console.log('✅ Beneficiary: "Mom Ghana" for client@demo.com');

  // ── 9. Demo FraudAlert ──────────────────────────────────────────────────────
  const existingAlert = await prisma.fraudAlert.findFirst({ where: { userId: client.id } });
  if (!existingAlert) {
    await prisma.fraudAlert.create({
      data: {
        userId:   client.id,
        type:     'large_transaction',
        severity: 'MEDIUM',
        status:   'OPEN',
        details:  { amount: 750000, currency: 'RWF', corridor: 'RWF_GHS', description: 'Client attempted a transfer of 750,000 RWF which exceeds the large-transaction threshold.' },
      },
    });
  }
  console.log('✅ FraudAlert: demo large-TX alert for client@demo.com');

  // ── 10. Demo AmlCheck ──────────────────────────────────────────────────────
  const existingAml = await prisma.amlCheck.findFirst({ where: { userId: client.id } });
  if (!existingAml) {
    await prisma.amlCheck.create({
      data: {
        userId:       client.id,
        status:       'CLEAR',
        riskScore:    0,
        matchDetails: { status: 'CLEAR', matchScore: 0, pepMatch: false, sanctionMatch: false },
        screenedAt:   new Date(),
      },
    });
  }
  console.log('✅ AmlCheck: CLEAR for client@demo.com');

  // ── 11. Welcome notification ────────────────────────────────────────────────
  await prisma.notification.create({
    data: {
      userId:  client.id,
      channel: 'in_app',
      type:    'system',
      title:   'Welcome to GlobalTransact!',
      body:    'Your account is set up and ready. Complete KYC to unlock higher transfer limits.',
      isRead:  false,
    },
  });
  console.log('✅ Notification: welcome message for client@demo.com');

  // ── Done ─────────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!\n');
  console.log('  Demo accounts:');
  console.log('    client@demo.com        / Client@12345');
  console.log('    agent@demo.com         / Agent@12345');
  console.log('    admin@demo.com         / Admin@12345');
  console.log('    compliance@demo.com    / Comply@12345');
  console.log('    superadmin@demo.com    / Super@12345');
  console.log('\n  Legacy accounts:');
  console.log('    admin@globaltransact.com          (unchanged)');
  console.log('    agent.kigali@globaltransact.com   / Agent@Kigali2024!');
  console.log('    agent.accra@globaltransact.com    / Agent@Accra2024!');
  console.log('    alice@example.com                 / Client@Test2024!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
