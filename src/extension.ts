// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


const REGISTER_REGEX =
    /\b(rax|rbx|rcx|rdx|eax|ebx|ecx|edx|r8|r9|r10|r11|r12|r13|r14|r15|r8w|r9w|r10w|r11w|r12w|r13w|r14w|r15w|r8d|r9d|r10d|r11d|r12d|r13d|r14d|r15d|r8b|r9b|r10b|r11b|r12b|r13b|r14b|r15b|ax|bx|cx|dx|si|di|bp|sp|cs|ds|es|ss|ah|al|bh|bl|ch|cl|dh|dl)\b/i;


const INSTRUCTION_REGEX = 
    /\b(jnc|stc|clc|jc)\b/i;


function randomHex(bytes: number): string {
    let value = 0;
    for (let i = 0; i < bytes; i++) {
        value = (value << 8) | (Math.random() * 256) | 0;
    }
    return "0x" + value.toString(16).padStart(bytes * 2, "0").toUpperCase();
}


// returns the size of a register, in bytes
function getRegisterSize(register: string): number {
	if (register.length === 0){
		return 0;
	}
	register = register.toLowerCase();
	if (register.endsWith('l') || register.endsWith('h')) {
		return 1;
	}

	if (register.length === 3) {
		if (register[0] === 'e' && register.endsWith('x')) {
			return 4; // e_x
		}
		if (register[0] === 'r' && register.endsWith('x')) {
			return 8; // r_x
		}
		if (register === 'ebp') {
			return 4;
		}
		
		if (register === 'ebp') {
			return 4;
		}


		if (register === 'r8d') {
			return 4; 
		}
		if (register === 'r9d') {
			return 4; 
		}

		
		if (register === 'r8w') {
			return 2; 
		}
		if (register === 'r9w') {
			return 2; 
		}

				
		if (register === 'r8b') {
			return 1; 
		}
		if (register === 'r9b') {
			return 1; 
		}





		if (register === 'rbp') {
			return 8;
		}
		if (register === 'rsp') {
			return 8;
		}

		if (register === 'r10') {
			return 8; 
		}
		if (register === 'r11') {
			return 8;
		}
		if (register === 'r12') {
			return 8; 
		}
		if (register === 'r13') {
			return 8; 
		}
		if (register === 'r14') {
			return 8; 
		}
		if (register === 'r15') {
			return 8; 
		}
	}
	else if (register.length === 2) {
		if (register.length === 2 && register[0] >= 'a' && register[0] <= 'd' && register.endsWith('x')) {
			return 2;
		}
		if (register === 'bp') {
			return 2;
		}

		if (register === 'r8') {
			return 8;
		}
		if (register === 'r9') {
			return 8;
		}
	} 
	else if (register.length === 4) {
		if (register[0]==='r' && register.endsWith('d')) {
			return 4;
		}
		if (register[0]==='r' && register.endsWith('w')) {
			return 2;
		}
		if (register[0]==='r' && register.endsWith('b')) {
			return 1;
		}
	}

	return 0;
}

// Key = lowercase register name, Value = string (from debugger or emulator)
const registerCache: Map<string, string> = new Map();

async function fetchVariables(session: vscode.DebugSession, variablesReference: number) {
    const result: [string, string][] = [];
    const vars = await session.customRequest("variables", { variablesReference });

    for (const v of vars.variables) {
        if (v.variablesReference && v.variablesReference > 0) {
            // This is a nested scope, recurse
            const nested = await fetchVariables(session, v.variablesReference);
            result.push(...nested);
        } else {
            // This is a real register, store it
            result.push([v.name.toLowerCase(), v.value]);
        }
    }
    return result;
}


async function updateRegisters() {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
		console.log("Failed to find debug session");
		return;
	}

	console.log("Found debug session.");

    try {
		const threads = await session.customRequest("threads");
		const threadId = threads.threads[0]?.id;
		if (!threadId) {
			console.log("Failed to find threadID");
			return;
		}

		
       
        const stack = await session.customRequest("stackTrace", { threadId });
        if (!stack.stackFrames || stack.stackFrames.length === 0) {
			console.error("Failed to obtain stack frame information.");
			return;
		}

        const scopes = await session.customRequest("scopes", { frameId: stack.stackFrames[0].id });

        registerCache.clear();

      
        for (const scope of scopes.scopes) {
            if (!scope.variablesReference) continue;

            // fetch all registers recursively
            const registers = await fetchVariables(session, scope.variablesReference);
            for (const [name, value] of registers) {
                registerCache.set(name, value);
            }
        }

        console.log("Registers updated:", Array.from(registerCache.entries()));
		
        //console.log("Registers updated:", Array.from(registerCache.entries()));
    } catch {}
}



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Required bc for some reason vscode won't recognize my debugger config
	vscode.workspace.getConfiguration('debug').update('allowBreakpointsEverywhere', true, false);

	vscode.debug.onDidChangeActiveDebugSession(() => updateRegisters());
	vscode.debug.onDidReceiveDebugSessionCustomEvent(() => updateRegisters());


	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	vscode.window.showInformationMessage('REGHOVER is active!');


    const hoverProvider: vscode.HoverProvider = {
        async provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position, REGISTER_REGEX);
            if (!range) return;

            const reg = document.getText(range).toLowerCase();

			const regSize = getRegisterSize(reg)

            // 8-bit vs 16-bit registers
            //const is8bit = reg.length === 2 && (reg.endsWith("h") || reg.endsWith("l"));
            //const value = randomHex(is8bit ? 1 : 2);

				
			await updateRegisters();

			//const jsonString = JSON.stringify(Object.fromEntries(registerCache));
			//console.log(jsonString);
			//console.log(Array.from(registerCache.entries()));
			
			if (vscode.debug.activeDebugSession) {
				return new vscode.Hover(
					new vscode.MarkdownString(
						`[${regSize}] **${reg.toUpperCase()}** = \`${registerCache.get(reg)}\`\n \`${parseInt(registerCache.get(reg) ?? "0x0",16)}\``
					)
				);
			} else {
				return new vscode.Hover(
					new vscode.MarkdownString(
						`[${regSize}] **${reg.toUpperCase()}**`
					)
				);
			}
        }
    };

	context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            [
                { language: 'asm' },
                { language: 'nasm' },
                { language: 'x86asm' },
                { language: 'assembly' },
				{ language: 'asm-intel-x86-generic' }
            ],
            hoverProvider
        )
    );


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('helloworldts.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello from REGHOVER!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
