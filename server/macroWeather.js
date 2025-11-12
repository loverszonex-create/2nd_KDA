import { fetchKospiQuote, fetchVolumeRatio } from './kis.js';
import { fetchVkospiOpening } from './krx.js';
import { fetchFearGreedIndex } from './cnn.js';
import { fetchAdrFromAdrinfo } from './adrCrawler.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const WEIGHT_INDEX = Number(process.env.MACRO_WEATHER_WEIGHT_INDEX ?? 0.45);
const WEIGHT_VKOSPI = Number(process.env.MACRO_WEATHER_WEIGHT_VKOSPI ?? 0.30);
const WEIGHT_FGI = Number(process.env.MACRO_WEATHER_WEIGHT_FGI ?? 0.25);

export function computeMacroWeatherScore({
  indexChange,
  adrPercent,
  volumePercent,
  vkospi,
  cnnFgi
} = {}) {
  const detail = {
    index: null,
    vkospi: null,
    fgi: null,
    adrRatio: null,
    volumeRatio: null,
    weights: {
      index: 0,
      vkospi: 0,
      fgi: 0
    }
  };

  const contributions = [];
  const clampWeight = (val) => (Number.isFinite(val) && val > 0 ? val : 0);

  if (Number.isFinite(indexChange)) {
    const indexScore = clamp(indexChange + 3, 0, 6) * (100 / 6);
    detail.index = indexScore;
    const weight = clampWeight(WEIGHT_INDEX);
    detail.weights.index = weight;
    contributions.push({ weight, value: indexScore });
  }

  if (Number.isFinite(vkospi)) {
    let vkospiScore;
    if (vkospi <= 10) vkospiScore = 100;
    else if (vkospi >= 40) vkospiScore = 0;
    else vkospiScore = (40 - vkospi) * (100 / 30);
    detail.vkospi = clamp(vkospiScore, 0, 100);
    const weight = clampWeight(WEIGHT_VKOSPI);
    detail.weights.vkospi = weight;
    contributions.push({ weight, value: detail.vkospi });
  }

  const adrRatio = Number.isFinite(adrPercent) ? adrPercent / 100 : null;
  const volumeRatio = Number.isFinite(volumePercent) ? volumePercent / 100 : null;
  detail.adrRatio = adrRatio;
  detail.volumeRatio = volumeRatio;

  if (Number.isFinite(cnnFgi)) {
    let fgiScore;
    if (cnnFgi <= 25 || cnnFgi >= 75) {
      fgiScore = cnnFgi;
    } else if (
      Number.isFinite(adrRatio) &&
      Number.isFinite(volumeRatio) &&
      adrRatio >= 1.2 &&
      volumeRatio >= 1.2
    ) {
      fgiScore = 75;
    } else if (
      Number.isFinite(adrRatio) &&
      Number.isFinite(volumeRatio) &&
      adrRatio <= 0.8 &&
      volumeRatio <= 0.8
    ) {
      fgiScore = 25;
    } else {
      fgiScore = cnnFgi;
    }
    detail.fgi = clamp(fgiScore, 0, 100);
    const weight = clampWeight(WEIGHT_FGI);
    detail.weights.fgi = weight;
    contributions.push({ weight, value: detail.fgi });
  }

  const totalWeight = contributions.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    return { score: null, components: detail };
  }

  const rawScore =
    contributions.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
  const score = Math.round(clamp(rawScore, 0, 100));

  return {
    score,
    components: {
      ...detail,
      rawScore
    }
  };
}

export function mapWeatherThermometer(score) {
  if (!Number.isFinite(score)) {
    return {
      label: '😐⚪',
      band: 'unknown',
      description: '데이터가 부족해 시장 기온을 계산할 수 없어요.'
    };
  }

  if (score <= 15) {
    return {
      label: '😱🔵',
      band: 'extreme_fear',
      description: '극단적인 침체 구간이에요.'
    };
  }
  if (score <= 35) {
    return {
      label: '😟🟢',
      band: 'fear',
      description: '시장 분위기가 다소 침체되어 있어요.'
    };
  }
  if (score <= 65) {
    return {
      label: '🙂⚪',
      band: 'neutral',
      description: '시장이 비교적 안정적으로 보입니다.'
    };
  }
  if (score <= 85) {
    return {
      label: '😎🟠',
      band: 'greed',
      description: '시장에 긍정적인 열기가 감도는 중이에요.'
    };
  }
  return {
    label: '🔥🔴',
    band: 'extreme_greed',
    description: '과열 구간입니다. 과도한 낙관에 주의하세요.'
  };
}

export async function fetchMacroWeather() {
  const errors = [];

  const [
    kospiResult,
    adrResult,
    volumeResult,
    vkospiResult,
    fgiResult
  ] = await Promise.allSettled([
    fetchKospiQuote(),
    fetchAdrFromAdrinfo(),
    fetchVolumeRatio(),
    fetchVkospiOpening(),
    fetchFearGreedIndex({ force: false })
  ]);

  const safeValue = (result, label) => {
    if (result.status === 'fulfilled') return result.value;
    errors.push(`${label}: ${result.reason?.message || result.reason}`);
    return null;
  };

  const kospi = safeValue(kospiResult, 'KOSPI quote');
  const adr = safeValue(adrResult, 'ADR');
  const volume = safeValue(volumeResult, 'Volume ratio');
  const vkospi = safeValue(vkospiResult, 'VKOSPI');
  const fgi = safeValue(fgiResult, 'CNN FGI');

  const inputs = {
    indexChange: kospi?.pct_change ?? null,
    adrPercent: adr?.adr ?? null,
    volumePercent: volume?.ratio ?? null,
    vkospi: vkospi?.openingPrice ?? null,
    cnnFgi: fgi?.score ?? null
  };

  const { score, components } = computeMacroWeatherScore(inputs);
  const thermometer = mapWeatherThermometer(score);

  return {
    ok: Number.isFinite(score),
    score,
    band: thermometer.band,
    label: thermometer.label,
    description: thermometer.description,
    components,
    inputs,
    errors,
    fetchedAt: new Date().toISOString()
  };
}

export default {
  computeMacroWeatherScore,
  mapWeatherThermometer,
  fetchMacroWeather
};



