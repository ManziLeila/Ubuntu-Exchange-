const axios = require('axios');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { Decimal } = require('@prisma/client/runtime/library');

/**
 * Get currency setting or create default
 */
async function getCurrencySetting(corridor) {
  let setting = await prisma.currencySetting.findUnique({
    where: { corridor },
    include: { forexRate: true }
  });

  // Create default if doesn't exist
  if (!setting) {
    setting = await prisma.currencySetting.create({
      data: {
        corridor,
        mode: 'AUTOMATIC',
        spread: new Decimal('0.025'), // 2.5%
        isActive: true,
        forexRate: {
          create: {
            corridor,
            fromCcy: corridor.split('_')[0],
            toCcy: corridor.split('_')[1],
            midRate: new Decimal('1.0'),
            spreadPct: new Decimal('0.025'),
            clientRate: new Decimal('0.975'),
            fetchedAt: new Date(),
            isStale: true,
            setByAdmin: false
          }
        }
      },
      include: { forexRate: true }
    });
  }

  return setting;
}

/**
 * Set manual rate for a currency pair
 */
async function setManualRate(corridor, manualRate, spread = null) {
  const setting = await getCurrencySetting(corridor);

  const rateDecimal = new Decimal(manualRate.toString());
  const spreadDecimal = spread ? new Decimal(spread.toString()) : setting.spread;
  const clientRate = rateDecimal.mul(new Decimal('1').minus(spreadDecimal));

  await prisma.$transaction(async (tx) => {
    // Update currency setting
    await tx.currencySetting.update({
      where: { corridor },
      data: {
        mode: 'MANUAL',
        manualRate: rateDecimal,
        spread: spreadDecimal,
        lastRate: rateDecimal,
        lastFetchedAt: new Date(),
        autoFallbackRate: rateDecimal // Save as fallback
      }
    });

    // Update forex rate
    await tx.forexRate.update({
      where: { id: setting.forexRate.id },
      data: {
        midRate: rateDecimal,
        clientRate: clientRate,
        spreadPct: spreadDecimal,
        fetchedAt: new Date(),
        isStale: false,
        setByAdmin: true
      }
    });
  });

  logger.info(`Manual rate set for ${corridor}: ${rateDecimal} (spread: ${spreadDecimal})`);

  return {
    corridor,
    mode: 'MANUAL',
    manualRate: rateDecimal,
    spread: spreadDecimal,
    clientRate: clientRate
  };
}

/**
 * Set automatic mode and fetch live rates
 */
async function setAutomaticMode(corridor) {
  const setting = await getCurrencySetting(corridor);
  const rate = await fetchLiveRate(corridor);

  if (!rate) {
    logger.warn(`Failed to fetch live rate for ${corridor}, using fallback`);
    return {
      corridor,
      mode: 'AUTOMATIC',
      warning: 'Failed to fetch rate, using last known rate'
    };
  }

  await prisma.currencySetting.update({
    where: { corridor },
    data: {
      mode: 'AUTOMATIC',
      lastRate: rate.clientRate,
      lastFetchedAt: new Date(),
      autoFallbackRate: rate.clientRate
    }
  });

  logger.info(`Automatic mode enabled for ${corridor}`);

  return {
    corridor,
    mode: 'AUTOMATIC',
    currentRate: rate.clientRate,
    midRate: rate.midRate
  };
}

/**
 * Fetch live exchange rate from external API
 * This is where you would integrate with a forex API (e.g., Open Exchange Rates, Fixer.io, etc.)
 */
async function fetchLiveRate(corridor) {
  try {
    const [fromCcy, toCcy] = corridor.split('_');

    // Example: using exchangerate-api.com (free tier available)
    const apiKey = process.env.FOREX_API_KEY || 'demo';
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${fromCcy}`;

    const response = await axios.get(url, { timeout: 5000 });

    if (response.data.result !== 'success') {
      throw new Error(`API error: ${response.data['error-type']}`);
    }

    const midRate = new Decimal(response.data.conversion_rates[toCcy].toString());
    const setting = await getCurrencySetting(corridor);
    const spread = setting.spread;
    const clientRate = midRate.mul(new Decimal('1').minus(spread));

    return {
      midRate,
      clientRate,
      spread,
      fetchedAt: new Date()
    };
  } catch (error) {
    logger.error(`Failed to fetch live rate for ${corridor}:`, error.message);

    // Return fallback rate if available
    const setting = await getCurrencySetting(corridor);
    if (setting.autoFallbackRate) {
      return {
        midRate: setting.autoFallbackRate,
        clientRate: setting.autoFallbackRate.mul(new Decimal('1').minus(setting.spread)),
        isFallback: true,
        fetchedAt: new Date()
      };
    }

    return null;
  }
}

/**
 * Get current rate based on mode (MANUAL or AUTOMATIC)
 */
async function getCurrentRate(corridor) {
  const setting = await getCurrencySetting(corridor);

  if (!setting.isActive) {
    throw new Error(`Currency setting for ${corridor} is not active`);
  }

  if (setting.mode === 'MANUAL') {
    if (!setting.manualRate) {
      throw new Error(`Manual rate not set for ${corridor}`);
    }

    return {
      corridor,
      mode: 'MANUAL',
      midRate: setting.manualRate,
      clientRate: setting.manualRate.mul(new Decimal('1').minus(setting.spread)),
      spread: setting.spread,
      source: 'manual'
    };
  }

  // Automatic mode - fetch fresh rate
  const rate = await fetchLiveRate(corridor);

  if (!rate) {
    throw new Error(`Unable to get rate for ${corridor}`);
  }

  // Update last rate in DB
  if (!rate.isFallback) {
    await prisma.currencySetting.update({
      where: { corridor },
      data: {
        lastRate: rate.midRate,
        lastFetchedAt: new Date(),
        autoFallbackRate: rate.midRate
      }
    });
  }

  return {
    corridor,
    mode: 'AUTOMATIC',
    midRate: rate.midRate,
    clientRate: rate.clientRate,
    spread: setting.spread,
    source: rate.isFallback ? 'fallback' : 'live',
    fetchedAt: rate.fetchedAt
  };
}

/**
 * Get all currency settings for admin dashboard
 */
async function getAllCurrencySettings() {
  return prisma.currencySetting.findMany({
    include: { forexRate: true },
    orderBy: { corridor: 'asc' }
  });
}

/**
 * Toggle currency active status
 */
async function toggleCurrencyStatus(corridor, isActive) {
  return prisma.currencySetting.update({
    where: { corridor },
    data: { isActive },
    include: { forexRate: true }
  });
}

/**
 * Update spread for a currency pair
 */
async function updateSpread(corridor, spread) {
  const spreadDecimal = new Decimal(spread.toString());

  const setting = await prisma.currencySetting.update({
    where: { corridor },
    data: { spread: spreadDecimal },
    include: { forexRate: true }
  });

  // Recalculate client rate based on current mid rate
  const midRate = setting.forexRate.midRate;
  const newClientRate = midRate.mul(new Decimal('1').minus(spreadDecimal));

  await prisma.forexRate.update({
    where: { id: setting.forexRate.id },
    data: {
      spreadPct: spreadDecimal,
      clientRate: newClientRate
    }
  });

  return {
    corridor,
    spread: spreadDecimal,
    midRate,
    clientRate: newClientRate
  };
}

module.exports = {
  getCurrencySetting,
  setManualRate,
  setAutomaticMode,
  fetchLiveRate,
  getCurrentRate,
  getAllCurrencySettings,
  toggleCurrencyStatus,
  updateSpread
};
