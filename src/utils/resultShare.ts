import rkWordmark from '../../ROOMINGKOS BRANDING/Logo/PNG/Copy of RK_Brandmark_RED_CMYK.png';
import rkPatternGrey from '../../ROOMINGKOS BRANDING/Logo/PNG/RK_PATTERN_GREY.png';
import type { PlayerRecord } from '../types';

const POSTER_WIDTH = 1200;
const POSTER_HEIGHT = 1500;
const assetDataUrlCache = new Map<string, Promise<string>>();

interface ResultPlacement {
  label: string;
  rankNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillTop: string;
  fillBottom: string;
  edgeColor: string;
  plaqueFill: string;
  plaqueTextColor: string;
  badgeFill: string;
  badgeTextColor: string;
  highlightFill: string;
  player?: PlayerRecord;
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function wrapText(value: string, maxLineLength: number, maxLines: number) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return ['TBD'];
  }

  const rawWords = trimmedValue.split(/\s+/);
  const words = rawWords.flatMap((word) => {
    if (word.length <= maxLineLength) {
      return [word];
    }

    const chunks: string[] = [];

    for (let index = 0; index < word.length; index += maxLineLength) {
      chunks.push(word.slice(index, index + maxLineLength));
    }

    return chunks;
  });
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxLineLength) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return ['TBD'];
  }

  if (lines.length <= maxLines) {
    return lines.map((line) => truncateText(line, maxLineLength));
  }

  return [
    ...lines.slice(0, maxLines - 1).map((line) => truncateText(line, maxLineLength)),
    truncateText(lines.slice(maxLines - 1).join(' '), maxLineLength),
  ];
}

function formatPlayer(player?: PlayerRecord) {
  if (!player || player.empty) {
    return {
      nameLines: ['TBD'],
      meta: 'UNIT -',
    };
  }

  return {
    nameLines: wrapText(player.name, 15, 2),
    meta: truncateText(`UNIT ${player.unitNumber || '-'}`, 24),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getNameTypography(width: number, nameLines: string[]) {
  const longestLineLength = nameLines.reduce((maxLength, line) => Math.max(maxLength, line.length), 1);
  const estimatedFontSize = Math.floor((width + 16) / (longestLineLength * 0.72));
  const fontSize = clamp(estimatedFontSize, 24, 36);
  const lineHeight = Math.round(fontSize * 0.92);

  return {
    fontSize,
    lineHeight,
  };
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to read branding asset.'));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => reject(new Error('Unable to read branding asset.'));
    reader.readAsDataURL(blob);
  });
}

function loadAssetDataUrl(assetUrl: string) {
  const cached = assetDataUrlCache.get(assetUrl);

  if (cached) {
    return cached;
  }

  const promise = fetch(assetUrl)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Unable to load branding asset: ${assetUrl}`);
      }

      return blobToDataUrl(await response.blob());
    });

  assetDataUrlCache.set(assetUrl, promise);
  return promise;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to render the result poster image.'));
    image.src = url;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('Unable to generate the result poster image.');
  }

  return blob;
}

function createObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

function renderPlacement(placement: ResultPlacement) {
  const player = formatPlayer(placement.player);
  const badgeCx = placement.x + placement.width / 2;
  const plaqueHeight = player.nameLines.length > 1 ? 130 : 116;
  const plaqueY = placement.y - plaqueHeight + 4;
  const rankBadgeCy = plaqueY - 42;
  const rankFontSize = placement.label === '1ST' ? 44 : 40;
  const bigNumberFontSize = placement.label === '1ST' ? 178 : 154;
  const { fontSize: nameFontSize, lineHeight: nameLineHeight } = getNameTypography(
    placement.width,
    player.nameLines,
  );
  const nameStartY = plaqueY + (player.nameLines.length > 1 ? 38 : 46);
  const metaY = plaqueY + plaqueHeight - 20;

  return `
    <g>
      <circle
        cx="${badgeCx}"
        cy="${rankBadgeCy}"
        r="52"
        fill="${placement.badgeFill}"
        stroke="#15161a"
        stroke-width="8"
        filter="url(#shadowSoft)"
      />
      <text
        x="${badgeCx}"
        y="${rankBadgeCy + 15}"
        text-anchor="middle"
        font-size="${rankFontSize}"
        font-weight="900"
        fill="${placement.badgeTextColor}"
        font-family="'Arial Black', 'Arial', sans-serif"
      >${placement.label}</text>

      <rect
        x="${placement.x - 14}"
        y="${plaqueY}"
        width="${placement.width + 28}"
        height="${plaqueHeight}"
        rx="34"
        fill="${placement.plaqueFill}"
        stroke="#15161a"
        stroke-width="8"
        filter="url(#shadow)"
      />
      <text
        x="${badgeCx}"
        y="${nameStartY}"
        text-anchor="middle"
        font-size="${nameFontSize}"
        font-weight="900"
        fill="${placement.plaqueTextColor}"
        font-family="'Arial Black', 'Arial', sans-serif"
      >
        ${player.nameLines
          .map(
            (line, lineIndex) =>
              `<tspan x="${badgeCx}" dy="${lineIndex === 0 ? 0 : nameLineHeight}">${escapeXml(line)}</tspan>`,
          )
          .join('')}
      </text>
      <text
        x="${badgeCx}"
        y="${metaY}"
        text-anchor="middle"
        font-size="22"
        font-weight="700"
        letter-spacing="1.2"
        fill="${placement.badgeTextColor}"
        font-family="'Helvetica Neue', 'Arial', sans-serif"
      >${escapeXml(player.meta.toUpperCase())}</text>

      <rect
        x="${placement.x}"
        y="${placement.y}"
        width="${placement.width}"
        height="${placement.height}"
        rx="34"
        fill="url(#podium-${placement.label})"
        stroke="#15161a"
        stroke-width="8"
        filter="url(#shadow)"
      />
      <rect
        x="${placement.x + 18}"
        y="${placement.y + 18}"
        width="${placement.width - 36}"
        height="86"
        rx="25"
        fill="${placement.highlightFill}"
        opacity="0.8"
      />
      <rect
        x="${placement.x + 24}"
        y="${placement.y + 22}"
        width="${placement.width - 48}"
        height="16"
        rx="8"
        fill="${placement.edgeColor}"
        opacity="0.9"
      />
      <text
        x="${badgeCx}"
        y="${placement.y + placement.height - 40}"
        text-anchor="middle"
        font-size="${bigNumberFontSize}"
        font-weight="900"
        fill="#15161a"
        font-family="'Arial Black', 'Arial', sans-serif"
      >${placement.rankNumber}</text>
    </g>
  `;
}

async function createPosterMarkup(
  firstPlace?: PlayerRecord,
  secondPlace?: PlayerRecord,
  thirdPlace?: PlayerRecord,
) {
  const [wordmarkDataUrl, patternGreyDataUrl] = await Promise.all([
    loadAssetDataUrl(rkWordmark),
    loadAssetDataUrl(rkPatternGrey),
  ]);

  const today = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const placements: ResultPlacement[] = [
    {
      label: '2ND',
      rankNumber: '2',
      x: 146,
      y: 992,
      width: 236,
      height: 300,
      fillTop: '#e9eef6',
      fillBottom: '#cfd7e4',
      edgeColor: '#6f7d92',
      plaqueFill: '#ffffff',
      plaqueTextColor: '#16171a',
      badgeFill: '#fff7ea',
      badgeTextColor: '#44597b',
      highlightFill: '#f8fbff',
      player: secondPlace,
    },
    {
      label: '1ST',
      rankNumber: '1',
      x: 472,
      y: 880,
      width: 256,
      height: 448,
      fillTop: '#ffe98e',
      fillBottom: '#f1c54f',
      edgeColor: '#be213f',
      plaqueFill: '#fff9f2',
      plaqueTextColor: '#16171a',
      badgeFill: '#fff4db',
      badgeTextColor: '#8b4f00',
      highlightFill: '#fff3bf',
      player: firstPlace,
    },
    {
      label: '3RD',
      rankNumber: '3',
      x: 818,
      y: 1038,
      width: 236,
      height: 254,
      fillTop: '#f2c79f',
      fillBottom: '#e7a366',
      edgeColor: '#945734',
      plaqueFill: '#fff7f0',
      plaqueTextColor: '#16171a',
      badgeFill: '#fff4e9',
      badgeTextColor: '#7b4a1f',
      highlightFill: '#ffdcbc',
      player: thirdPlace,
    },
  ];

  const placementMarkup = placements.map((placement) => renderPlacement(placement)).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" viewBox="0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}">
      <defs>
        <linearGradient id="bgGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7f2eb" />
          <stop offset="100%" stop-color="#efe4d9" />
        </linearGradient>
        <linearGradient id="topBandGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#cc2645" />
          <stop offset="55%" stop-color="#bb1f42" />
          <stop offset="100%" stop-color="#8b2037" />
        </linearGradient>
        <linearGradient id="paperGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#fffdf8" />
          <stop offset="100%" stop-color="#f5ede4" />
        </linearGradient>
        <pattern id="patternGreyTile" width="164" height="164" patternUnits="userSpaceOnUse">
          <image href="${patternGreyDataUrl}" x="0" y="0" width="164" height="164" preserveAspectRatio="none" />
        </pattern>
        <linearGradient id="podium-1ST" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffe98e" />
          <stop offset="100%" stop-color="#f1c54f" />
        </linearGradient>
        <linearGradient id="podium-2ND" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#e9eef6" />
          <stop offset="100%" stop-color="#cfd7e4" />
        </linearGradient>
        <linearGradient id="podium-3RD" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f2c79f" />
          <stop offset="100%" stop-color="#e7a366" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="0" flood-color="#15161a" flood-opacity="0.9" />
        </filter>
        <filter id="shadowSoft" x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="0" flood-color="#15161a" flood-opacity="0.55" />
        </filter>
      </defs>

      <rect width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" fill="url(#bgGradient)" />
      <rect x="0" y="0" width="${POSTER_WIDTH}" height="340" fill="url(#topBandGradient)" />
      <circle cx="994" cy="118" r="206" fill="#ffffff" opacity="0.08" />
      <circle cx="178" cy="56" r="126" fill="#ffffff" opacity="0.08" />
      <path d="M0 304 C164 260, 330 256, 514 308 S878 372, 1200 284 L1200 0 L0 0 Z" fill="#ffffff" opacity="0.07" />

      <rect
        x="60"
        y="214"
        width="1080"
        height="1214"
        rx="48"
        fill="url(#paperGradient)"
        stroke="#15161a"
        stroke-width="8"
        filter="url(#shadow)"
      />
      <circle cx="600" cy="938" r="290" fill="#ffffff" opacity="0.78" />
      <circle cx="600" cy="938" r="290" fill="url(#patternGreyTile)" opacity="0.06" />
      <circle cx="600" cy="938" r="290" fill="none" stroke="#d32646" stroke-width="8" opacity="0.12" />
      <path d="M166 804 C282 676, 420 618, 600 618 C780 618, 918 676, 1034 804" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.28" />

      <g transform="translate(150 102)">
        <rect width="900" height="126" rx="63" fill="#fffaf4" stroke="#15161a" stroke-width="8" filter="url(#shadowSoft)" />
        <image href="${wordmarkDataUrl}" x="74" y="36" width="752" height="54" preserveAspectRatio="xMidYMid meet" />
      </g>

      <g transform="translate(210 312)">
        <rect width="780" height="56" rx="28" fill="#15161a" />
        <text
          x="390"
          y="38"
          text-anchor="middle"
          font-size="27"
          font-weight="800"
          letter-spacing="5"
          fill="#fff8f0"
          font-family="'Helvetica Neue', 'Arial', sans-serif"
        >TABLE TENNIS TOURNAMENT</text>
      </g>

      <text
        x="600"
        y="474"
        text-anchor="middle"
        font-size="96"
        font-weight="900"
        fill="#15161a"
        font-family="'Arial Black', 'Arial', sans-serif"
      >CHAMPION</text>
      <text
        x="600"
        y="566"
        text-anchor="middle"
        font-size="96"
        font-weight="900"
        fill="#15161a"
        font-family="'Arial Black', 'Arial', sans-serif"
      >RESULT</text>

      <g>
        <line x1="340" y1="626" x2="470" y2="626" stroke="#15161a" stroke-width="6" stroke-linecap="round" opacity="0.82" />
        <line x1="730" y1="626" x2="860" y2="626" stroke="#15161a" stroke-width="6" stroke-linecap="round" opacity="0.82" />
        <circle cx="496" cy="626" r="7" fill="#bf1f41" />
        <circle cx="704" cy="626" r="7" fill="#bf1f41" />
        <text
          x="600"
          y="635"
          text-anchor="middle"
          font-size="25"
          font-weight="800"
          letter-spacing="1.4"
          fill="#bf1f41"
          font-family="'Helvetica Neue', 'Arial', sans-serif"
        >${escapeXml(today.toUpperCase())}</text>
      </g>

      <ellipse cx="600" cy="1340" rx="420" ry="56" fill="#bf1f41" opacity="0.15" />
      ${placementMarkup}

      <g transform="translate(166 1360)">
        <rect width="868" height="70" rx="35" fill="#15161a" />
        <text
          x="434"
          y="45"
          text-anchor="middle"
          font-size="24"
          font-weight="800"
          letter-spacing="3"
          fill="#fffaf4"
          font-family="'Helvetica Neue', 'Arial', sans-serif"
        >ROOMINGKOS EVENTS</text>
      </g>
    </svg>
  `;
}

export async function createResultPosterPng(
  firstPlace?: PlayerRecord,
  secondPlace?: PlayerRecord,
  thirdPlace?: PlayerRecord,
) {
  const posterMarkup = await createPosterMarkup(firstPlace, secondPlace, thirdPlace);
  const svgBlob = new Blob([posterMarkup], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const svgUrl = createObjectUrl(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = POSTER_WIDTH;
    canvas.height = POSTER_HEIGHT;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to access the image rendering context.');
    }

    context.drawImage(image, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
