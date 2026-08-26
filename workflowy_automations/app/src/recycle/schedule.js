const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function parisParts(now) {
  return Object.fromEntries(
    formatter.formatToParts(now)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  );
}

function parisDate(now) {
  const { year, month, day } = parisParts(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shouldCatchUp({ now, lastSuccessDate }) {
  const parts = parisParts(now);
  const isAfterFive = parts.hour > 5 || (parts.hour === 5 && parts.minute >= 0);
  return isAfterFive && lastSuccessDate !== parisDate(now);
}

function millisecondsUntilNextFiveParis(now) {
  const nextMinute = new Date(now);
  nextMinute.setUTCSeconds(0, 0);
  nextMinute.setUTCMinutes(nextMinute.getUTCMinutes() + 1);

  for (let minute = 0; minute <= 26 * 60; minute += 1) {
    const parts = parisParts(nextMinute);
    if (parts.hour === 5 && parts.minute === 0) {
      return nextMinute.getTime() - now.getTime();
    }
    nextMinute.setUTCMinutes(nextMinute.getUTCMinutes() + 1);
  }

  throw new Error('Unable to find next 05:00 Europe/Paris');
}

module.exports = { parisDate, shouldCatchUp, millisecondsUntilNextFiveParis };
