import type { Body } from './body.ts'
import type { Mind } from './mind.ts'
import { findNearest } from './senses.ts'
import { note } from './skills.ts'
import { builtDecor } from './tasks/decor.ts'

/*
 * The travelling merchant (see engine/events.ts): a human in a purple cloak who walks in from the
 * edge of the world, goes to find someone, trades with them, and walks back out (vanishing at the
 * edge). It doesn't sleep, build or fight: it just trades.
 *
 * What it trades, with the customer:
 *   - sells a sheep or a cow (3 gold) to someone with a pen that has room (they carry it home);
 *   - buys wool (2 for 1 silver, keeping 3 for a blanket) and amethysts (1 for 2 gold);
 *   - sells iron (3 for 2 gold, or 4 silver) to someone still after iron tools;
 *   - sells wheat seeds (3 for 1 silver) to someone with none, and gunpowder (3 for 1 gold) to a musket owner.
 */

/** Looks for a customer this far away (and keeps an eye on them as they move). */
const SEARCH = 200
/** Gives up and leaves after this many actions; leaving, it's gone after this many at most (stuck on the way out). */
const STAY = 3000
const LEAVE = 1500
const TRADE_RANGE = 2

const LEAVING = 1

/** One action of the merchant's day. */
export function merchantThink(body: Body) {
  const { mind } = body
  mind.task = 'idle'
  if (mind.say && --mind.say.ttl <= 0) mind.say = null
  if (mind.phase === LEAVING || ++mind.timer > STAY) {
    if (mind.phase !== LEAVING) mind.timer = 0
    mind.phase = LEAVING
    const out = mind.leaveTo
    if (!out || Math.abs(body.x - out.x) <= 2 || ++mind.timer > LEAVE) {
      body.vanish()
      return
    }
    body.walkTo(out)
    return
  }
  // Find a customer (anyone but another merchant) and walk up to them.
  if (!mind.target || mind.timer % 30 === 1) {
    mind.target = findNearest(body, SEARCH, (x, y) => body.get(x, y) === 'human' && body.mindAt(x, y)?.role !== 'merchant')
    if (!mind.target) {
      mind.phase = LEAVING
      mind.timer = 0
      return
    }
  }
  const t = mind.target
  if (Math.abs(t.x - body.x) <= TRADE_RANGE && Math.abs(t.y - body.y) <= 2) {
    const customer = body.mindAt(t.x, t.y)
    if (customer) trade(body, customer)
    mind.phase = LEAVING
    mind.timer = 0
    return
  }
  body.walkTo(t)
}

/** Everything a customer wants to buy and sell, in one go. */
function trade(body: Body, customer: Mind) {
  const { mind } = body
  const { inv, tools } = customer
  const deals: string[] = []
  const pen = builtDecor(customer, 'pen')[0]
  if (pen && !customer.carrying && inv.gold >= 3) {
    const animal = body.random() < 0.5 ? 'cow' : 'sheep'
    inv.gold -= 3
    customer.carrying = animal
    deals.push(`bought a ${animal} for the pen`)
  }
  const wool = Math.floor(Math.max(0, inv.wool - (customer.blanket ? 0 : 3)) / 2)
  if (wool > 0) {
    inv.wool -= wool * 2
    inv.silver += wool
    deals.push(`sold ${wool * 2} wool`)
  }
  if (inv.amethyst > 0) {
    inv.gold += inv.amethyst * 2
    deals.push(`sold ${inv.amethyst} amethyst${inv.amethyst > 1 ? 's' : ''}`)
    inv.amethyst = 0
  }
  if ((tools.pickaxe < 3 || tools.sword < 3) && (inv.gold >= 2 || inv.silver >= 4)) {
    if (inv.gold >= 2) inv.gold -= 2
    else inv.silver -= 4
    inv.iron += 3
    deals.push('bought 3 iron')
  }
  if (inv.grain === 0 && inv.silver >= 1) {
    inv.silver--
    inv.grain += 3
    deals.push('bought some wheat seeds')
  }
  if (tools.gun && inv.gunpowder < 3 && inv.gold >= 1) {
    inv.gold--
    inv.gunpowder += 3
    deals.push('bought gunpowder')
  }
  if (deals.length) {
    note(customer, `Traded with ${mind.name} the merchant: ${deals.join(', ')}.`, 'friend')
    mind.say = { text: 'A pleasure doing business!', ttl: 30 }
    customer.say = { text: 'Good deal!', ttl: 25 }
  } else {
    note(customer, `${mind.name} the merchant came by, but I had nothing to trade.`, 'friend')
    mind.say = { text: 'Maybe next time!', ttl: 30 }
  }
}
