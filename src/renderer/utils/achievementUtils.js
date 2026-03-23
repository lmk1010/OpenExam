import achievementCatalog from '../../shared/achievementCatalog.json';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(value, max));
const toNumber = (value) => Number(value) || 0;
const ratio = (value, target) => target > 0 ? clamp(toNumber(value) / target) : 0;
const cap = (value, target) => Math.min(toNumber(value), target);

function buildRequirementProgress(requirement, context) {
  const target = toNumber(requirement.target);
  const current = toNumber(context[requirement.metric]);
  return {
    current,
    target,
    progressRatio: ratio(current, target),
    text: `${cap(current, target)}/${target}${requirement.suffix || ''}`,
  };
}

function computeAchievement(definition, context) {
  if (definition.type === 'combo') {
    const parts = (definition.requirements || []).map((requirement) => buildRequirementProgress(requirement, context));
    return {
      unlocked: parts.length > 0 && parts.every((item) => item.current >= item.target),
      progressRatio: parts.length > 0 ? Math.min(...parts.map((item) => item.progressRatio)) : 0,
      progressText: parts.map((item) => item.text).join(' · '),
    };
  }

  const current = toNumber(context[definition.metric]);
  const target = toNumber(definition.target);
  return {
    unlocked: current >= target,
    progressRatio: ratio(current, target),
    progressText: `${cap(current, target)}/${target}${definition.suffix || ''}`,
  };
}

function buildAchievementContext(data = {}) {
  const practiceStats = data.practiceStats || {};
  const achievementMetrics = data.achievementMetrics || {};
  const heatmap = Array.isArray(data.heatmap) ? data.heatmap : [];
  const totalDone = toNumber(practiceStats.totalDone);
  const totalQuestions = toNumber(practiceStats.totalQuestions) || toNumber(achievementMetrics.totalQuestions);
  const mastery = toNumber(achievementMetrics.mastery) || (totalQuestions > 0 ? Math.round((totalDone / totalQuestions) * 100) : 0);

  return {
    totalDone,
    accuracy: toNumber(practiceStats.accuracy),
    streak: toNumber(data.streak),
    totalMinutes: toNumber(data.totalMinutes),
    sessions: toNumber(achievementMetrics.sessions) || heatmap.reduce((sum, item) => sum + toNumber(item.sessions), 0),
    studyDays: toNumber(achievementMetrics.studyDays) || heatmap.filter((item) => toNumber(item.count) > 0).length,
    perfectCount: toNumber(achievementMetrics.perfectCount),
    speedCount: toNumber(achievementMetrics.speedCount),
    wrongCount: toNumber(practiceStats.wrongCount) || toNumber(achievementMetrics.wrongCount),
    reviewCount: toNumber(achievementMetrics.reviewCount),
    categoryCoverage: toNumber(achievementMetrics.categoryCoverage),
    savedAIPapers: toNumber(achievementMetrics.savedAIPapers),
    totalQuestions,
    mastery,
  };
}

export function normalizeAchievements(rawAchievements = [], data = {}) {
  const context = buildAchievementContext(data);
  const rawMap = new Map((Array.isArray(rawAchievements) ? rawAchievements : []).map((item) => [item.id, item]));

  const normalized = achievementCatalog.map((definition, index) => {
    const raw = rawMap.get(definition.id) || {};
    const computed = computeAchievement(definition, context);
    const unlocked = typeof raw.unlocked === 'boolean' ? raw.unlocked : computed.unlocked;

    return {
      id: definition.id,
      name: raw.name || definition.name,
      desc: raw.desc || definition.desc,
      group: raw.group || definition.group,
      tier: raw.tier || definition.tier,
      iconKey: raw.iconKey || definition.iconKey,
      unlocked,
      progressRatio: Number.isFinite(raw.progressRatio) ? clamp(raw.progressRatio) : (unlocked ? Math.max(computed.progressRatio, 1) : computed.progressRatio),
      progressText: raw.progressText || computed.progressText || (unlocked ? '已完成' : '继续练习即可解锁'),
      order: index,
    };
  });

  const extras = (Array.isArray(rawAchievements) ? rawAchievements : [])
    .filter((item) => !achievementCatalog.some((definition) => definition.id === item.id))
    .map((item, index) => ({
      ...item,
      group: item.group || 'growth',
      tier: item.tier || 'bronze',
      iconKey: item.iconKey || 'trophy',
      progressRatio: Number.isFinite(item.progressRatio) ? clamp(item.progressRatio) : (item.unlocked ? 1 : 0),
      progressText: item.progressText || (item.unlocked ? '已完成' : '继续练习即可解锁'),
      order: achievementCatalog.length + index,
    }));

  return [...normalized, ...extras].sort((a, b) => (a.order || 0) - (b.order || 0));
}
