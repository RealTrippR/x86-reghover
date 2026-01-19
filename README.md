# reghover V0.0.2
<hr>

Reghover is a vscode extension that improves x86 assembly debugging by allowing for registers to be quickly inspected by hovering over them.

Currently Reghover only supports NASM syntax but may be expanded to work with over assemblers and instruction sets in the future.

## Requirements

It is recommended that you install NASM syntax highlighting [[See Here](https://marketplace.visualstudio.com/items?itemName=LucianIrsigler.nasm "Nasm x86_64 syntax highlighting")] for the best experience.

## Keybinds

When hovering over a register, 2 keybinds are automatically enabled:

E - Toggles whether registers should be treated as a pointer and its memory contents shown.

Q - If pointer inpsection mode is toggled, this changes whether the contents at the address of the
    current pointer should be displayed as a string or shown as hex values.




## Known limitations

Reghover will enable the workspace setting 'Allow breakpoints anywhere'. Otherwise, you wouldn't be able to set breakpoints in assembly code.

Reghover can only inspect memory addresses if the active debugger is GDB compatible, and is currently fixed to 32 bytes at a time.
## Todo

Implement instruction cards. See INSTRUCTION_CARDS_GUIDE.txt for more information on this.

### 0.0.1 [1/16/2026]
    Initial prototype

    
### 0.0.2 [1/18/2026]
    Initial public beta release



**Copyright (C), 2025 - Tripp R. All rights reserved.**
Published Under the **Robins Free of Charge & Open Source Public License 25**
