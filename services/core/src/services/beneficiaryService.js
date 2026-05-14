const prisma = require('../utils/prisma');

async function create(userId, data) {
  return prisma.beneficiary.create({ data: { ...data, userId } });
}

async function list(userId) {
  return prisma.beneficiary.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
  });
}

async function getById(userId, id) {
  const b = await prisma.beneficiary.findFirst({ where: { id, userId, isActive: true } });
  if (!b) throw Object.assign(new Error('Beneficiary not found'), { statusCode: 404 });
  return b;
}

async function update(userId, id, data) {
  await getById(userId, id);
  return prisma.beneficiary.update({ where: { id }, data });
}

async function remove(userId, id) {
  await getById(userId, id);
  return prisma.beneficiary.update({ where: { id }, data: { isActive: false } });
}

module.exports = { create, list, getById, update, remove };
