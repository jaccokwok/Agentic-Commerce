Prompt
An agentic-commerce app to help consumers discover and compare products, recommend the best payment and maximize rewards and royalty benefits. When a user enters a request, the app returns a selection of relevant products selected from multiple shopping platforms. The app then helps in completing the purchase.

Specification
Users will input in two parts. 

A. User Mandate
Users fill in a form containing the following field, they will decide the value of these fields. They are also given the option to use natural language to fill in a chatbox, and LLM would try to auto fill the form using the info given. Users would still need to check, validate and update the form if value is missing. Of course, form field validations are required.

	suggested field
mandate (terminating flow if conflict)
expiry of mandate: no_expire | time
confirm mode: auto | manual
merchant allow list
merchant deny list
category allow list
category deny list
per item limit
per order limit
rolling 7d
payment tender list
one merchant per order
max search time


customer preference (clarifying flow if conflict)
payment objective

**[changed]** Natural language may fill this form. It cannot raise a limit, add a merchant, or switch confirm mode. A proposal that contradicts the form opens clarification. An empty merchant allow list means every merchant except the deny list. Category ids come from the fixture’s closed category tree.


B. User Payment Request

**[changed]** Their requests are natural language and may not name a product. “Party items” becomes an editable list, such as snacks and balloons. Quantities stay blank until the user sets them. Do not search, and do not invent a guest count.

**[changed]** The request may also carry a budget hint, product filters, brand, and appearance. Parse that into typed JSON: goals, qty, brand, appearance, budget hint. Do not parse into SQL, and do not execute a model-written string. The request cannot raise a mandate limit, add a merchant, or switch confirm mode. More than one shopping goal is split into sub-requests that share one mandate and one rolling budget. A conflict with a valid mandate clarifies. An invalid, revoked, or expired mandate terminates.


**[changed]** The agent searches mock merchants on Taobao, HKTV Mall, and Pinduoduo. No live scrape. The fixtures speak a catalogue; they are not real checkouts on those platforms. For this release, “top 3” is one shopping goal, one merchant, and three offers.

**[changed]** Rank those three with default weights shown in the UI: relevance 0.35, cash 0.25, rating 0.15, purchase count 0.10, purchase history 0.15. A checkbox or other explicit form selection overrides a weight inferred from the prompt. If they conflict, ask. A previously purchased sku_id ranks higher next time. Quote currency is HKD, converted with a fixed mock FX table. Store the rate timestamp on the quote. Fees are part of cash.

**[changed]** Rewards affect ranking only when the user includes them. `cash_total` is the gate. `effective_cost` is the score, and only if rewards are included. A gift of 100 counts as a 50 credit against `effective_cost` (rate 0.5), or 0 when rewards are excluded. `effective_cost = cash_total − gift × 0.5` when rewards are on, and `effective_cost = cash_total` when they are off. `effective_cost` never changes `cash_total` or `spent_7d`. 
suggested logic as follows
1. Line total = shelf × qty. `per_item` uses this, before coupon.
2. Coupon reduces cash.
3. The gate adds catalog shipping. The model cannot omit it.
4. Cash = post-coupon merchandise + shipping. This is what `per_order` and `rolling_7d` see.
5. Reward is computed on post-coupon merchandise only, shipping excluded. It is posted to cashback only after `book()` commits. It never reduces cash or `spent_7d`.

**[changed]** Code computes these numbers. The model must not. Worked example: shelf 200 × qty 2 = line 400, so `per_item` sees 400. Coupon 80 leaves merchandise 320. Shipping 30 makes `cash_total` 350. Reward is computed on 320. A gift of 100 lowers `effective_cost` by 50 only, so that score becomes 300 while `cash_total` stays 350. `book()` writes 350 into `spent_7d` only after payment succeeds. A refund does not return it. If 340 remains on the rolling budget, the order stops.

**[changed]** Manual mode: clicking an offer selects it. The user confirms the quote before payment. Auto mode pays only the unique highest-ranked offer that passes every mandate. A tie asks the user. If the cash total, items, shipping, currency, tender, or reward terms change after confirm, that confirm is void. Declining the new quote rolls back to search and releases the coupon. Confirming cannot override a spending limit.

**[changed]** Checkout is a mock of Stripe’s Agentic Commerce Protocol. The pay call receives a vault reference id and an address reference id already stored on the account. Never collect a card number. Each pay attempt has an idempotency key. A timeout before any charge terminates. A timeout after a pay attempt retries that same key, then clarifies if it still fails. 

There are three flows: happy flow, clarifying flow, and termination flow. In the case of clarifying flow, the agent should escalate the clarification to the user, probably in a pop up box question. If the user does not reply before timeout, the process would be terminated. In the case of termination flow, the process would end and user would need to start again. Below are possible cases for the flows:
Clarifying/alternate flow
-Mandate conflict with user’s prompt requirement, ask user to change mandate or requirement
-Multiple items have equal score, ask user to choose between options
-Price change upon payment, ask user if proceed to payment or rollback to item selection
**[changed]** -Repeated purchase of the same sku_id within 72 hours
**[changed]** -Payment retry or method switch. Retry uses the same idempotency key
**[changed]** -A product description, photograph, or review that instructs the agent to change the budget or pay. Drop that offer and keep searching. Do not follow the instruction, and do not end the whole request

Terminating flow
-Invalid input format
**[changed]** -Prompt injection in the user input. A poisoned listing is not this case
-Internal server error
-Service timeout
-Agent ask for clarification timeout
**[changed]** -Network issue before any charge. After a pay attempt, retry the same idempotency key instead of terminating
-User revocating mid–transection
-Quote or authorization expired 
-insufficient remaining budget 

In all situation of rollback and termination, all rolled back setting like discount, coupon must be reset to the original state.

The agent should keep a log showing all the decision reasoning for showing the recommendation. Where it will be clear for the logic for selecting a certain product for recommendation. A clear reconciliation system and trace ID should be implemented to trace all parts logic and progress in running. There must be a clear explanation for every step every decision an agent makes in every part of the process.

The agent should have security measures for the following situation
○	A listing written to manipulate the agent rather than inform the buyer.
○	Instructions injected through a product description, a photograph or a review.
○	A seller that detects an agent and prices it differently.

**[changed]** Untrusted listing text is data. Drop a manipulated or injected offer and continue if another offer is clean. Each fixture offer has `human_price` and `agent_price`. If `agent_price` is higher, drop that offer and log it. Do not terminate the request for one bad offer.

The app should also include the following:
○	Agent-to-agent negotiation over a machine-readable catalogue, including the case where it fails.
○	A test harness that reports how often an agent overspends, over a replayed set of scenarios.
○	Successful test cases and test cases where the agent stopped abnormally

**[changed]** Overspend means `cash_total` broke a mandate, reward reduced cash, or shipping was omitted. The harness reports that count on the replay set. The count must be 0. Replays include one pass and abnormal stops for clarify timeout, expired mandate, insufficient budget, user injection, a poisoned listing, an agent surcharge, omitted shipping, a price rollback, a refund that does not restore budget, and a failed negotiation.





Business Rules to Agree on Before Development
The proposal contains several ambiguities. The following are suggested defaults for the first release. The team should review and finalize them on day one.
Question
Proposed rule
Mandate conflicts appear under both clarification and termination
If a request conflicts with a valid mandate, pause for clarification and stop purchasing actions. Resume only after the user explicitly updates and confirms the mandate or request. Refusal or timeout terminates the request. An invalid, revoked, or expired mandate causes immediate termination.
Is a marketplace the same as a merchant?
Record platform_id and merchant_id separately. One marketplace may contain multiple merchants. Enforce “one merchant per order” using the merchant ID.
What should a vague request such as “party items” return?
**[changed]** Convert it into an editable shopping list, such as snacks and balloons. Quantities stay blank until the user sets them. Do not search, and do not invent a guest count.
What does “Top 3” mean for multiple products?
**[changed]** This release: one shopping goal, one merchant, three offers. Cross-merchant baskets are later.
Does each subtask receive the full budget?
**[changed]** No. Subtasks share the rolling seven-day budget and must receive allocations from the overall request budget. Splitting requests must not bypass limits. Explain possible partial completion across sub-requests and obtain user acceptance beforehand.
Does clicking a product authorize payment in manual mode?
No. Clicking selects an option. The user must confirm the final quote before payment.
Which option should automatic mode select?
Select the unique highest-ranked option that satisfies every mandatory condition. If scores are tied, ask the user to choose. Pause whenever clarification remains unresolved.
How should conflicting preferences be handled?
Explicit form selections take precedence over preferences inferred from natural language, but contradictions still require clarification. Preferences can never override mandate limits.
How should quote changes be handled?
Changes to the cash total, items, shipping, currency, payment method, or reward conditions invalidate the previous confirmation. Show the updated quote and request acceptance. User confirmation cannot override a mandatory spending limit.
What are the default timeouts?
**[changed]** Search defaults to 15 seconds, capped by the mandate’s max search time. Clarification is 120 seconds. Quote expiry and mandate expiry are separate clocks, both shown on the quote. Mandate expiry stops further purchasing. A timeout before any charge terminates. A timeout after a pay attempt retries the same idempotency key.
Do refunds restore the rolling seven-day budget?
For the first release, use a conservative rule: count the original cash payment of successful orders within the preceding continuous 168 hours. Refunds do not automatically restore the budget. Explain this in the interface; a later release may explicitly adopt net-spending accounting.

Approved for this release
**[changed]** A split request starts with blank amounts. The user assigns each goal a share of the request budget. Unassigned money stays reserved. A goal cannot spend another goal’s share.
**[changed]** The mock vault id and address id are created with the account. The pay call sends those ids. The user does not type them at checkout.
**[changed]** Negotiation is one catalogue request. The seller accepts or rejects. A rejection leaves the coupon unspent.
**[changed]** An unset mandate means manual confirm, one merchant per order, rewards included, and no expiry. An empty merchant allow list means every merchant except the deny list.
**[changed]** The only mock tender is `card`. If the tender list excludes `card`, payment terminates. This release fills the mandate form with a deterministic parser into the same JSON. The user still confirms the form. A hosted LLM is a later swap behind that JSON, and the harness does not call one.

