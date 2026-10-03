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


B. User Payment Request

Their requests are natural language where it may not contain the actual product name (e.g. Users enter party items, it should return snacks and balloons). 

The user input would also include some limitations on the product and mandate on the action of the agent, which include budget restriction, product filtering, branding preference, product appearance. These should be implemented in <NATURAL LANGUAGE PROCESSING>. (One suggestion is use llm to transform the prompt into a standardized sql-like language for more accurate parsing and execution). In the case where user prompt is too long and too much intent, it would be separated into multiple request and handle separately. In the case of violating the mandate, if would go in clarifying or termination flow.


WhThe agent should perform web scrap search on the shopping platform Taobao, HKTV Mall, PingDuoDuo. Please mock the web scraping part, no need actual web scrape. Then show the best 3 options considering the weighted score of rating of the product, how many people have purchased, cost, relevance, purchase history. (Use predefined default weights for ranking. Adjust them through user-selected checkboxes or preferences identified in the user’s prompt. Explicit selections take priority; ask for clarification if they conflict with the prompt. )When a user has purchased one of the items, it is more likely to be listed as one of the recommendations next time. The extra fees and currency being used should also be considered

When the cost of the product is considered, the discount, loyalty point and other non-cash reward should also be considered (e.g. A gift of value $100 may be considered as half value). User should have an option to not include these reward into consideration
suggested logic as follows
1. Line total = shelf × qty. `per_item` uses this, before coupon.
2. Coupon reduces cash.
3. The gate adds catalog shipping. The model cannot omit it.
4. Cash = post-coupon merchandise + shipping. This is what `per_order` and `rolling_7d` see.
5. Reward is computed on post-coupon merchandise only, shipping excluded. It is posted to cashback only after `book()` commits. It never reduces cash or `spent_7d`.

In the case of manual confirmation in mandate, the user would need to click confirm to proceed with the purchase. For auto confirmation, the agent would go directly to payment. If the cost changes in between web search and payment, it will have pop up box to ask if user accept the new changed price, otherwise it would be rolled back to the web search and do the web search and comparison part again.


The user can click on the product and the agent then proceed to complete the purchase, with Stripe's Agentic Commerce Protocol. The agent should enter the customer information with Client-Side Vaulting & Address Reference.

A mock stripe 

There are three flows: happy flow, clarifying flow, and termination flow. In the case of clarifying flow, the agent should escalate the clarification to the user, probably in a pop up box question. If the user does not reply before timeout, the process would be terminated. In the case of termination flow, the process would end and user would need to start again. Below are possible cases for the flows:
Clarifying/alternate flow
-Mandate conflict with user’s prompt requirement, ask user to change mandate or requirement
-Multiple items have equal score, ask user to choose between options
-Price change upon payment, ask user if proceed to payment or rollback to item selection
-Repeated purchase at a short period of time
-Payment retry or method switch 
-Product descriptions or reviews instruct the agent to modify the budget or initiate a payment 

Terminating flow
-Invalid input format
-Prompt injection format (user input/product description)
-Internal server error
-Service timeout
-Agent ask for clarification timeout
-Network issue
-User revocating mid–transection
-Quote or authorization expired 
-insufficient remaining budget 

In all situation of rollback and termination, all rolled back setting like discount, coupon must be reset to the original state.

The agent should keep a log showing all the decision reasoning for showing the recommendation. Where it will be clear for the logic for selecting a certain product for recommendation. A clear reconciliation system and trace ID should be implemented to trace all parts logic and progress in running. There must be a clear explanation for every step every decision an agent makes in every part of the process.

The agent should have security measures for the following situation
○	A listing written to manipulate the agent rather than inform the buyer.
○	Instructions injected through a product description, a photograph or a review.
○	A seller that detects an agent and prices it differently.

The app should also include the following:
○	Agent-to-agent negotiation over a machine-readable catalogue, including the case where it fails.
○	A test harness that reports how often an agent overspends, over a replayed set of scenarios.
○	Successful test cases and test cases where the agent stopped abnormally





Business Rules to Agree on Before Development
The proposal contains several ambiguities. The following are suggested defaults for the first release. The team should review and finalize them on day one.
Question
Proposed rule
Mandate conflicts appear under both clarification and termination
If a request conflicts with a valid mandate, pause for clarification and stop purchasing actions. Resume only after the user explicitly updates and confirms the mandate or request. Refusal or timeout terminates the request. An invalid, revoked, or expired mandate causes immediate termination.
Is a marketplace the same as a merchant?
Record platform_id and merchant_id separately. One marketplace may contain multiple merchants. Enforce “one merchant per order” using the merchant ID.
What should a vague request such as “party items” return?
Convert it into an editable shopping list, such as snacks and balloons. Clarify guest count or quantities when they affect purchasing. Do not silently make assumptions that increase spending.
What does “Top 3” mean for multiple products?
For a single product, show three product-and-payment combinations. For multiple products from one merchant, show three shopping-basket options. Split cross-merchant purchases into separate orders, displaying individual and combined cash totals. Do not promise that all merchant orders will complete together.
Does each subtask receive the full budget?
No. Subtasks share the rolling seven-day budget and must receive allocations from the overall request budget. Splitting requests must not bypass limits. Explain possible partial completion across merchants and obtain user acceptance beforehand.
Does clicking a product authorize payment in manual mode?
No. Clicking selects an option. The user must confirm the final quote before payment.
Which option should automatic mode select?
Select the unique highest-ranked option that satisfies every mandatory condition. If scores are tied, ask the user to choose. Pause whenever clarification remains unresolved.
How should conflicting preferences be handled?
Explicit form selections take precedence over preferences inferred from natural language, but contradictions still require clarification. Preferences can never override mandate limits.
How should quote changes be handled?
Changes to the cash total, items, shipping, currency, payment method, or reward conditions invalidate the previous confirmation. Show the updated quote and request acceptance. User confirmation cannot override a mandatory spending limit.
What are the default timeouts?
Suggested defaults are 15 seconds for search and 120 seconds for clarification. Quotes and payment credentials use their stated expiry times. All timeouts are configurable. Mandate expiry immediately stops further purchasing actions.
Do refunds restore the rolling seven-day budget?
For the first release, use a conservative rule: count the original cash payment of successful orders within the preceding continuous 168 hours. Refunds do not automatically restore the budget. Explain this in the interface; a later release may explicitly adopt net-spending accounting.

