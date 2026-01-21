import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAssetPath } from './utils';

const contentDirectory = path.join(process.cwd(), 'content');

// Boulder와 Problem 개수 계산 헬퍼 함수
function getCragCounts(cragSlug: string): { boulderCount: number; problemCount: number } {
  const bouldersDir = path.join(contentDirectory, 'crags', cragSlug, 'boulders');

  if (!fs.existsSync(bouldersDir)) {
    return { boulderCount: 0, problemCount: 0 };
  }

  const boulderFolders = fs.readdirSync(bouldersDir).filter((name) => {
    const fullPath = path.join(bouldersDir, name);
    return fs.statSync(fullPath).isDirectory();
  });

  let totalProblems = 0;

  boulderFolders.forEach((boulderFolder) => {
    const boulderPath = path.join(bouldersDir, boulderFolder);
    const problemFiles = fs.readdirSync(boulderPath).filter(
      (file) => file.endsWith('.md') && file !== 'index.md'
    );
    totalProblems += problemFiles.length;
  });

  return {
    boulderCount: boulderFolders.length,
    problemCount: totalProblems,
  };
}

// 사이트 설정 가져오기
export function getSiteSettings() {
  const filePath = path.join(contentDirectory, 'settings', 'site.md');

  if (!fs.existsSync(filePath)) {
    return {
      heroImage: getAssetPath('/images/hero-sample.jpg'),
      slogan1: 'DREAM to DREAM!',
      slogan2: 'WORK LESS, CLIMB MORE!',
    };
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(fileContents);

  return {
    heroImage: getAssetPath(data.heroImage || '/images/hero-sample.jpg'),
    slogan1: data.slogan1 || 'DREAM to DREAM!',
    slogan2: data.slogan2 || 'WORK LESS, CLIMB MORE!',
  };
}

// Crag 목록 가져오기
export function getAllCrags() {
  const cragsDirectory = path.join(contentDirectory, 'crags');

  if (!fs.existsSync(cragsDirectory)) {
    return [];
  }

  const entries = fs.readdirSync(cragsDirectory);
  const crags = entries
    .filter((entry) => {
      // .md 파일이거나 디렉토리인 경우
      const fullPath = path.join(cragsDirectory, entry);
      if (entry.endsWith('.md')) return true;
      if (fs.statSync(fullPath).isDirectory()) {
        // 디렉토리 안에 index.md가 있는지 확인
        return fs.existsSync(path.join(fullPath, 'index.md'));
      }
      return false;
    })
    .map((entry) => {
      let slug: string;
      let filePath: string;

      if (entry.endsWith('.md')) {
        slug = entry.replace(/\.md$/, '');
        filePath = path.join(cragsDirectory, entry);
      } else {
        slug = entry;
        filePath = path.join(cragsDirectory, entry, 'index.md');
      }

      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContents);

      // 난이도 범위 처리
      let difficultyMin = data.difficultyMin || 'V0';
      let difficultyMax = data.difficultyMax || 'V10';

      if (!data.difficultyMin && !data.difficultyMax && data.difficulty) {
        const match = data.difficulty.match(/^(V\d+)(?:-(V\d+))?$/);
        if (match) {
          difficultyMin = match[1];
          difficultyMax = match[2] || match[1];
        }
      }

      // boulder/problem 개수 자동 계산
      const counts = getCragCounts(slug);

      return {
        slug,
        title: data.title || '',
        thumbnail: getAssetPath(data.thumbnail || ''),
        difficultyMin,
        difficultyMax,
        description: data.description || '',
        boulderCount: counts.boulderCount,
        problemCount: counts.problemCount,
      };
    });

  return crags;
}

// Culture (Trable + Rock Trip) 목록 가져오기
export function getAllCultureItems() {
  const items: Array<{
    slug: string;
    title: string;
    date: string;
    thumbnail: string;
    excerpt: string;
    type: 'trable' | 'rocktrip';
  }> = [];

  // Trable
  const trableDirectory = path.join(contentDirectory, 'culture', 'trable');
  if (fs.existsSync(trableDirectory)) {
    const trableFiles = fs.readdirSync(trableDirectory);
    trableFiles
      .filter((fileName) => fileName.endsWith('.md'))
      .forEach((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        const filePath = path.join(trableDirectory, fileName);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);

        items.push({
          slug,
          title: data.title || '',
          date: data.date ? formatDate(data.date) : '',
          thumbnail: data.thumbnail || '',
          excerpt: data.excerpt || '',
          type: 'trable',
        });
      });
  }

  // Rock Trip
  const rocktripDirectory = path.join(contentDirectory, 'culture', 'rocktrip');
  if (fs.existsSync(rocktripDirectory)) {
    const rocktripFiles = fs.readdirSync(rocktripDirectory);
    rocktripFiles
      .filter((fileName) => fileName.endsWith('.md'))
      .forEach((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        const filePath = path.join(rocktripDirectory, fileName);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);

        items.push({
          slug,
          title: data.title || '',
          date: data.date ? formatDate(data.date) : '',
          thumbnail: data.thumbnail || '',
          excerpt: data.excerpt || '',
          type: 'rocktrip',
        });
      });
  }

  // 날짜순 정렬 (최신순)
  items.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return items;
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0].replace(/-/g, '.');
}

// 단일 Crag 상세 정보 가져오기
export function getCragBySlug(slug: string) {
  // 먼저 디렉토리 구조 확인
  const cragDir = path.join(contentDirectory, 'crags', slug);
  const cragFile = path.join(contentDirectory, 'crags', `${slug}.md`);

  let filePath: string;

  if (fs.existsSync(path.join(cragDir, 'index.md'))) {
    filePath = path.join(cragDir, 'index.md');
  } else if (fs.existsSync(cragFile)) {
    filePath = cragFile;
  } else {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(fileContents);

  let difficultyMin = data.difficultyMin || 'V0';
  let difficultyMax = data.difficultyMax || 'V10';

  if (!data.difficultyMin && !data.difficultyMax && data.difficulty) {
    const match = data.difficulty.match(/^(V\d+)(?:-(V\d+))?$/);
    if (match) {
      difficultyMin = match[1];
      difficultyMax = match[2] || match[1];
    }
  }

  // boulder/problem 개수 자동 계산
  const counts = getCragCounts(slug);

  return {
    slug,
    title: data.title || '',
    thumbnail: getAssetPath(data.thumbnail || ''),
    difficultyMin,
    difficultyMax,
    description: data.description || '',
    boulderCount: counts.boulderCount,
    problemCount: counts.problemCount,
    address: data.address || '',
    howToGetThere: data.howToGetThere || '',
    parkingSpot: data.parkingSpot || '',
    cafeLink: data.cafeLink || '',
    mapImage: getAssetPath(data.mapImage || ''),
    mapLink: data.mapLink || '',
  };
}

// Crag의 Boulder 목록 가져오기
export function getBouldersByCrag(cragSlug: string) {
  const bouldersDir = path.join(contentDirectory, 'crags', cragSlug, 'boulders');

  if (!fs.existsSync(bouldersDir)) {
    return [];
  }

  const boulderFolders = fs.readdirSync(bouldersDir).filter((name) => {
    const fullPath = path.join(bouldersDir, name);
    return fs.statSync(fullPath).isDirectory();
  });

  return boulderFolders.map((folderName) => {
    const indexPath = path.join(bouldersDir, folderName, 'index.md');

    let data: Record<string, unknown> = {};
    if (fs.existsSync(indexPath)) {
      const fileContents = fs.readFileSync(indexPath, 'utf8');
      data = matter(fileContents).data;
    }

    // Problem 개수 계산
    const boulderPath = path.join(bouldersDir, folderName);
    const problemFiles = fs.readdirSync(boulderPath).filter(
      (file) => file.endsWith('.md') && file !== 'index.md'
    );

    return {
      slug: folderName,
      title: (data.title as string) || folderName,
      thumbnail: getAssetPath((data.thumbnail as string) || ''),
      description: (data.description as string) || '',
      problemCount: problemFiles.length,
    };
  });
}

// Boulder의 Problem 목록 가져오기
export function getProblemsByBoulder(cragSlug: string, boulderSlug: string) {
  const boulderDir = path.join(contentDirectory, 'crags', cragSlug, 'boulders', boulderSlug);

  if (!fs.existsSync(boulderDir)) {
    return [];
  }

  const problemFiles = fs.readdirSync(boulderDir).filter(
    (file) => file.endsWith('.md') && file !== 'index.md'
  );

  return problemFiles.map((fileName) => {
    const slug = fileName.replace(/\.md$/, '');
    const filePath = path.join(boulderDir, fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug,
      title: data.title || '',
      grade: data.grade || 'V0',
      description: data.description || '',
    };
  });
}
