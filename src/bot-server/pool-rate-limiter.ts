import { assert } from "@std/assert";
import { minBy } from "@std/collections";

export class PoolRateLimiter {
	private users: string[] = [];
	private messageLimits = new Map<string, Map<string, Date>>();

	public getMinUserForKey(messageKey: string, periodMillis: number): string | undefined {
		const now = new Date();

		let userMap = this.messageLimits.get(messageKey);
		if (!userMap) {
			const newMap = new Map<string, Date>();
			this.users.forEach((u) => {
				newMap.set(u, now);
			});
			this.messageLimits.set(messageKey, newMap);
			userMap = newMap;
		}

		// Find all eligible dates in the past
		const eligibleUsers = [...userMap.entries()].filter(
			([_username, eligibleAt]) => now.valueOf() >= eligibleAt.valueOf(),
		);

		const result = minBy(eligibleUsers, ([_username, eligibleAt]) => eligibleAt.valueOf());
		if (!result) return;

		const [username, date] = result;

		assert(now.valueOf() >= date.valueOf(), "chosen minimum user should have an eligible date less than than now");

		// Eagerly apply new rate limit, to avoid any double-picking shenanigans
		userMap.set(username, new Date(now.valueOf() + periodMillis));

		return username;
	}

	public addUsers(newUsers: string[]) {
		this.users.push(...newUsers);
	}
}
