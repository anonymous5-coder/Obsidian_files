# Proposal: plan modification 
Your given concluded plan is exactly same as I needed. However, I came up with few ideas to do some changes in your given existing plan in the section 8 of REPORT.

## Retain tasks and intel
Continue In this pass again, Keep remembering that what you will have to change. Now, You will have to operate and process on both state3 and new-state dynamically. Remember these kind of changes for these both states:
- state3 : solutions given in section 8 from REPORT file
- new-state: by your analysis, results and conclusions in the end (i.e changes from state3) 

(Understand the working structure and output structure from this prompt)

## Ideas:
- **I1** FAB's clicking behaviour(little upgrade): OnClick: Quick commit only (no pull or push) ; OnHold: gold standard sync triggers. (Hold duration, may be around 1 sec or something, you propose the convinient number or float.) How is this idea !?.
- **I2** In union behaviour of both plugin, at the same time of booting, it must obey the gold standard sync, instead of pulling first. I see that, your plan says to keep "auto pull on boot"  ON , which triggers at 0.5 sec after boot only(not gold standard sync).
- **I3** from my many internal and intuitive reasoning, I decided to purge and remove 6 sec pre-commit idea from plan and program from codebase entirely. Previously We stated this as ideation and design flaw and issue. But the idea and program itself is not right.
- **I4** No Mode A and Mode B, but transparent access to all settings(which keeps in-it settings of mode A and Mode B). Here is what I meant: instead of giving user pre-seted settings, let them give access to all settings with pre configured default settings. (This approach is quite simple and straight). Here is what It should be like: on, "boot behaviour"  always ON by default (i.e gold standard sync on boot). exit behaviour turned on/off , not decided yet(concerns tied with I5), FAB turned on by default, 6 sec pre-commit removes entirely. Debounce and other stuff will be manageable by user from git plugin settings. Reasoning: Why not mode A/B presets , because there are 2 togglable behavioral options and not more. Here are all those reasonings described for all behaviour  ,- boot behaviour must on by default in all use cases (advantage for all cases),  exit behaviour (it's concern is tied with **I5** , but still consider it as optionally reach for all cases, because it gives advantage to all cases), togglable behaviour! : 1 minute debounce(automative) and FAB (Handy & straight) , where debounce behaviour is easily accessible and operable from git plugin settings , whereas FAB is accessible and operable from Companion plugin settings. In conclusion, more simple/easier and straight would be to provide those all straight settings , transparent to public , which are adaptable to each different kind of users.
- **I5** a little work on exit behaviour for sync (I give you explicit permission for this, besides editing report, in sake for that work, you have all permission given), we knew(or you may get to know) that, on imidiate-exit/swiping-out it's hard to start/process complete gold standard sync. But process succeeds if app stays in background by switching to other app. Let's give our best to fix that. That behaviour may currently triggers gold standard sync, right? Still , we have 2 options: commit only or gold standard sync? Because on boot, gold standard sync occurs already. If we try to occur local commits only by any kind of exit, will it be easy?, because we won't touch network. Let's use this fact : "the app which boots. Soon, it will have to exit for always.", so , can't we do pre-code/pre-program in plugin for that future exit? Ideate, analyse the system and process to solve this. (Note : we don't want to use termux in the workflow even for short period. One call then off is okay but try to avoid it as much as possible, since project is not for advanced user only for those who uses termux. the project is for public, all users.)

## Solution Change clarification 
Correct your plan and section 8 of REPORT. Revise it if needed , then we will execute that plan in the next pass.

### User clarification for the state3 : 
These are the needed edition for setup right? (Needs to edit or add these things in section 8 ):

**In git plugin**
- autoPullOnBoot *(I2 concerns, in union with companion plugin ,not decided yet)*
**In companion plugin**
- pre commit *(I3 concerns)*
- FAB edition *(I1 concerns, dual behaviour idea)*
- preset selector in settings for both modes  (*I4 concerns, says to rely on custom settings instead.)
- Boot *(I2 concerns, in union with git plugin ,not decided yet)*
- exit behaviour (**I5** concerns)

Documentation edition plan changes accordingly by you.


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

 - state3 : state3's solution depicts to change what.
 - new-state: by your analysis, results and conclusions, solutions depicts to change what?

# Guides :

## Checking convinience:
If it seems necessary and required to do the previous checking pass again. Then go ahead. This is your choise that awhat to focus on this pass to yield  (powerful and strong) the specific result and outcome . Otherwise You can continue focused work of checking in next future pass as well.

## Work and output convenience:
Do research, web search , audit wherever and whenever required or needed. Give your response and report in the section 8.


## Notes
- adb is attached at localhost 5555.
- both plugins are disabled in this pass. (Question: should I keep it disabled, in next pass. Or do you need me to enable it for any audit or execution purpose?)
- Don't do execution in this pass, this pass is for:  REPORT editing at section 8 for planning, ideating, designing, proposing.