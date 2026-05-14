const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');
const { generateURC } = require('../utils/helpers');
const logger = require('../utils/logger');

async function registerClient(agentId, data) {
  const { email, name, country, msisdn } = data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw Object.assign(new Error('A client with this email already exists'), { statusCode: 409 });

  const tempPassword = crypto.randomBytes(6).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const client = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: 'client',
        country,
        msisdn,
        passwordHash,
        status: 'active',
      },
    });
    await tx.clientWallet.create({ data: { userId: user.id } });
    return user;
  });

  logger.info({ msg: 'Agent registered new client', agentId, clientId: client.id });
  return { client, tempPassword };
}

async function listClients(agentId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  // Clients the agent has initiated transfers for
  const agentTransferUserIds = await prisma.transfer.findMany({
    where: { agentId },
    select: { senderId: true },
    distinct: ['senderId'],
  });
  const userIds = agentTransferUserIds.map(t => t.senderId);

  const [clients, total] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds }, role: 'client' },
      select: { id: true, name: true, email: true, country: true, msisdn: true, status: true, createdAt: true },
      skip, take: limit,
    }),
    prisma.user.count({ where: { id: { in: userIds }, role: 'client' } }),
  ]);
  return { clients, total, page, totalPages: Math.ceil(total / limit) };
}

async function getAgentTransfers(agentId, filters = {}, page = 1, limit = 20) {
  const where = { agentId };
  if (filters.status) where.status = filters.status;
  const skip = (page - 1) * limit;
  const [transfers, total] = await Promise.all([
    prisma.transfer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.transfer.count({ where }),
  ]);
  return { transfers, total, page, totalPages: Math.ceil(total / limit) };
}

async function getCommissions(agentId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [commissions, total] = await Promise.all([
    prisma.commission.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
      include: { transfer: { select: { urc: true, corridor: true, sendAmount: true, recvAmount: true } } },
    }),
    prisma.commission.count({ where: { agentId } }),
  ]);
  const totalEarned = await prisma.commission.aggregate({
    where: { agentId, status: { in: ['PENDING', 'PAID'] } },
    _sum: { amount: true },
  });
  return { commissions, total, page, totalPages: Math.ceil(total / limit), totalEarned: totalEarned._sum.amount || 0 };
}

async function getFloatBalance(agentId) {
  const wallets = await prisma.agentWallet.findMany({ where: { agentId } });
  const profile = await prisma.agentProfile.findUnique({ where: { agentId } });
  return { wallets, profile, agentId };
}

async function creditCommission(transferId, agentId, sendAmount, currency) {
  const profile = await prisma.agentProfile.findUnique({ where: { agentId } });
  const rate = profile?.commissionRate ? parseFloat(profile.commissionRate) : 0.005;
  const commissionAmount = parseFloat(sendAmount) * rate;

  return prisma.commission.create({
    data: {
      agentId,
      transferId,
      amount: commissionAmount,
      currency,
      rate,
      status: 'PENDING',
    },
  });
}

async function getOrCreateProfile(agentId) {
  let profile = await prisma.agentProfile.findUnique({ where: { agentId } });
  if (!profile) {
    profile = await prisma.agentProfile.create({ data: { agentId } });
  }
  return profile;
}

module.exports = { registerClient, listClients, getAgentTransfers, getCommissions, getFloatBalance, creditCommission, getOrCreateProfile };
