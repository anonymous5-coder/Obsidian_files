
Now I want to check the contradiction ,overlaps, issues and flaws between :

- Git plugin setup (no checking for plug-in it self actually) ; documentation: GIT_SYNC_ARCHITECTURE_PROPOSAL ) and
- GitSync Companion (plugin project itself) ; documentation: GIT_SYNC_COMPANION_PROPOSAL).

Subjects for checking includes: architecture, workflow, features and functionalities, Documentation, Companionship.

>One user side raised overlap suspicion:
>autoPullOnBoot may trigger at start of app. But companion plugin also triggers that same debounce's action at start. By this extra que may sent by doubling the pull request. (If above reasoned behaviour is true , then user can easily toggle autoPullOnBoot to false in plugin setting of Git Plugin, but by doing this, there can be scenario where commits are same with repo, then ). If this suspicion and reasonings are true , then 