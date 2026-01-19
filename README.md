# reghover 

<hr>

Reghover is a vscode extension that improves x86 assembly debugging by allowing for registers to be quickly inspected by hovering over them.

Currently Reghover only supports NASM syntax but may be expanded to work with over assemblers and instruction sets in the future.

## Requirements

It is recommended that you install NASM syntax highlighting [See Here](https://marketplace.visualstudio.com/items?itemName=LucianIrsigler.nasm "Nasm x86_64 syntax highlighting") for the best experience.

## Known limitations

Reghover will enable the workspace setting 'Allow breakpoints anywhere'. Otherwise, you wouldn't be able to set breakpoints in assembly code.

Reghover can only inspect memory addresses if the active debugger is GDB compatible, and is currently fixed to 32 bytes at a time.
## Todo

Implement instruction cards. See INSTRUCTION_CARDS_GUIDE.txt for more information on this.

### 0.0.1 [1/16/2026]
    Initial prototype

    
### 0.0.2 [1/18/2026]
    Initial public beta release