import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAssetPath } from './utils';

const contentDirectory = path.join(process.cwd(), 'content');

// 모든 Boulder 가져오기 (flat 구조)
function getAllBoulders() {
  const bouldersDir = path.join(contentDirectory, 'boulders');

  if (!fs.existsSync(bouldersDir)) {
    return [];
  }

  const files = fs.readdirSync(bouldersDir).filter((f) => f.endsWith('.md'));

  return files.map((fileName) => {
    const filePath = path.join(bouldersDir, fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug: data.slug || fileName.replace(/\.md$/, ''),
      crag: data.crag || '',
      title: data.title || '',
      thumbnail: getAssetPath(data.thumbnail || ''),
      description: data.description || '',
    };
  });
}

// 모든 Problem 가져오기 (flat 구조)
function getAllProblems() {
  const problemsDir = path.join(contentDirectory, 'problems');

  if (!fs.existsSync(problemsDir)) {
    return [];
  }

  const files = fs.readdirSync(problemsDir).filter((f) => f.endsWith('.md'));

  return files.map((fileName) => {
    const filePath = path.join(problemsDir, fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug: data.slug || fileName.replace(/\.md$/, ''),
      boulder: data.boulder || '',
      title: data.title || '',
      grade: data.grade || 'V0',
      description: data.description || '',
    };
  });
}

// Boulder와 Problem 개수 계산 헬퍼 함수 (relation 기반)
function getCragCounts(cragSlug: string): { boulderCount: number; problemCount: number } {
  const allBoulders = getAllBoulders();
  const allProblems = getAllProblems();

  const cragBoulders = allBoulders.filter((b) => b.crag === cragSlug);
  const cragBoulderSlugs = cragBoulders.map((b) => b.slug);
  const cragProblems = allProblems.filter((p) => cragBoulderSlugs.includes(p.boulder));

  return {
    boulderCount: cragBoulders.length,
    problemCount: cragProblems.length,
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
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => {
      const slug = entry.replace(/\.md$/, '');
      const filePath = path.join(cragsDirectory, entry);
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
      const counts = getCragCounts(data.slug || slug);

      return {
        slug: data.slug || slug,
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
  const cragFile = path.join(contentDirectory, 'crags', `${slug}.md`);

  if (!fs.existsSync(cragFile)) {
    return null;
  }

  const fileContents = fs.readFileSync(cragFile, 'utf8');
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
  const counts = getCragCounts(data.slug || slug);

  return {
    slug: data.slug || slug,
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
  const allBoulders = getAllBoulders();
  const allProblems = getAllProblems();

  const cragBoulders = allBoulders.filter((b) => b.crag === cragSlug);

  return cragBoulders.map((boulder) => {
    const problemCount = allProblems.filter((p) => p.boulder === boulder.slug).length;

    return {
      slug: boulder.slug,
      title: boulder.title,
      thumbnail: boulder.thumbnail,
      description: boulder.description,
      problemCount,
    };
  });
}

// Boulder의 Problem 목록 가져오기
export function getProblemsByBoulder(boulderSlug: string) {
  const allProblems = getAllProblems();

  return allProblems
    .filter((p) => p.boulder === boulderSlug)
    .map((problem) => ({
      slug: problem.slug,
      title: problem.title,
      grade: problem.grade,
      description: problem.description,
    }));
}

// Crag의 모든 Problem 목록 가져오기 (Route 탭용)
export function getAllProblemsByCrag(cragSlug: string) {
  const allBoulders = getAllBoulders();
  const allProblems = getAllProblems();

  const cragBoulders = allBoulders.filter((b) => b.crag === cragSlug);
  const cragBoulderSlugs = cragBoulders.map((b) => b.slug);

  return allProblems
    .filter((p) => cragBoulderSlugs.includes(p.boulder))
    .map((problem) => {
      const boulder = cragBoulders.find((b) => b.slug === problem.boulder);

      return {
        slug: problem.slug,
        title: problem.title,
        grade: problem.grade,
        description: problem.description,
        boulderSlug: problem.boulder,
        boulderTitle: boulder?.title || problem.boulder,
      };
    });
}
