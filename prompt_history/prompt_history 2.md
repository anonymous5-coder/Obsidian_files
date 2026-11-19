
# Retain tasks and intel
Keep remembering that what you will have to change. You will have to operate and process on these given states dynamically. Remember these kind of changes for these three states:
- before my proposal (i.e. your proposed solution and changeing tasks)
- after my proposal (i.e. my solution given in upcoming section)
- by your analysis, results and conclusions in the end (i.e. In union of above two states for chaneging tasks) 

(Understand the working structure and output structure from this prompt)
# User's needed clarifications
## I want to know and clarify this:
- Is 6 second pre commit does commits only or full debounce's syncing action. or push along with it only?
- 1 minute debounce does all git syncing actions right? i.e commit>pull>push (exact queueing order)
- at 0.5 sec, pull happens only right?
- at 2.5 sec, pull then push happens only right?
- what is `autoBackupAfterFileChange` ?
- what is `autoSaveInterval` ? Is that 60 second debounce interval for all sync actions.
- I feel, 6 sec is too fast. But if user exists before 6 seconds ,then problem arises. But still 6 seconds feels too fast and heavy for network. then it doesn't solve our issues and problems in that case. If that so, then it's our ideation and design problem. right? 

# Your proposed solution:

## Does it need betterment, revision and other next pass?
**In your proposed solution**:
*Does it need more better ideas, ways and approaches? Does it need revision? Does it need to proceed with other same next pass*

## Let me put that , how it should be like, for those all shown issues:

**For that 6 second pre commit behaviour**:
- pre commit must do, local commits only (no push or pull).
- It's behaviour should not be like trigger at 6 sec debounce from last change.
- It's another behaviour option should be like this: 6 sec interval loop starts for pre commit when write/changes starts to occur. ; 6 sec interval loop ends when this conditions are met : pre commit occured and writing/changing finished or stopped.(- **I3** you must know and clarify the trigger behaviour of 6 sec pre commit : 6 sec interval is the timer loop , which triggers commit at every 6 sec if, user is typing.(somewhat opposite of `autoBackupAfterFileChange` , but not complete opposite , and I guess, that behaviour will not be atchived if `autoBackupAfterFileChange` is off, this is just my guess., because while off, time clock starts, but it doesn't says that loop starts/ends when). Timer loop ON condition : Timer loop is triggered to start when this conditions are met, - user started to type/edit/modify. ; Timer loop OFF condition: timer loop turns OFF when this conditions are met, - user stopped to type/edit/modify. This is my revised and corrected version of explanation for this 6 sec timer loop behaviour for 6 sec pre commit interval.)
- This behaviour is heavy and repeatative than 6 sec debounce behaviour. We should not change the behaviour but add it instead. So behaviour can be changeable in an existing companion plugin settings.

**For that 1 Minute debounce behaviour**:
- ensure that, gold standard sequence are obeyed while sync triggers.
- if behaviour is not needed by user, then it's  user choise to tweak it in settings.

**For that behaviour after booting**:
- In union of both plugins behaviour on boot, it must reflect to the gold standard sequence behaviour.
- I think auto pull should be disabled from Git plugin settings and, needed behaviour should be atchived from Companion plugin. Or we can look for the way, that Git plugin it self occurs that behaviour on boot, if possible.

(This solution sounds for all public aspects. Each user may need different settings tweak, and plugins are adaptable to all those particular users. Edge cases has been considered where, files and notes are somehow written without booting the app, so written/modified notes and files are still retainable and manageable when, app starts later. Thanks to our behaviour of booting ideation. Is that right?)

# My proposed solution:

If my instinct is right and user's raised question(from the above section : User's needed clarifications) is questionable. Then, I propose this   solutions  :

**In this solution, I want to narrow down companionship and make the workflow easy and simple. (Handy)**

- disable 1 minute and 6 sec git's sync actions entirely. workflow will become independent of time-interval except boot of app.
-  Remember, The Gold-Standard Sequence: Commit-First $\to$ Pull-Second $\to$ Push-Third. I hope debounce's sync action and all behaviour (except 6 sec pre commit) were reflecting that.
- This Gold standard sequence must implies on boot of app and on FAB. (On exit and 1 minute debounce as well though)
- I may disable, auto sync on exit as well.
- for Companion plugin, keep FAB right there. Now workflow is human dependent instead of prescribing time interval and automations.

(This solution sounds niche to specific desire/intention and specific workflow/design/settings requirement. Propose weather, new light version of project is required , but if Manual settings solves everything instead of coding and setup. Then we may add new settings for pre-setting configuration for all such different use cases.)


# what do you see to change: 

## Tasks and intel
**For companion plugin**
- companion project's codebase by you or
- companion plugin's manual settings by user ?
**For Git plugin**
- plugin's setup by you or
- plugin's manual settings by user ?

In all cases , documentations changes will occur accordingly.

## states of changes

 - before my proposal : From the changes you planned. What changes does it depicts in Your given solution? :
 - after my proposal : My given solution depicts to change what
 - by your analysis, results and conclusions : In union, yielded results and solutions depicts to change what?

# Guides :

## Checking convinience:
If it seems necessary and required to do the previous checking pass again. Then go ahead. This is your choise that what to focus on this pass to yield  (powerful and strong) the specific result and outcome . Otherwise You can continue focused work of checking in next future pass as well.

## Work and output convenience:
Do research, web search , audit wherever and whenever required or needed. Give your response and report in the end of your work, appending in REPORT.


## Notes
- adb is attached at localhost 5555.
- both plugins are disabled in this pass.
- Don't do execution in this pass, this pass is for planning, ideating, designing, proposing and reporting.