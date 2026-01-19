// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// https://code.visualstudio.com/api/ux-guidelines/overview

enum mem_display_type {
	hex,
	ascii,
	digit
}


const REGISTER_REGEX =
    /\b(rsp|rbp|ebp|esp|bp|sp|rax|rbx|rcx|rdx|eax|ebx|ecx|edx|r8|r9|r10|r11|r12|r13|r14|r15|r8w|r9w|r10w|r11w|r12w|r13w|r14w|r15w|r8d|r9d|r10d|r11d|r12d|r13d|r14d|r15d|r8b|r9b|r10b|r11b|r12b|r13b|r14b|r15b|ax|bx|cx|dx|si|di|bp|sp|cs|ds|es|ss|ah|al|bh|bl|ch|cl|dh|dl)\b/i;

const INSTRUCTION_REGEX = 
    /\b(jnc|stc|clc|jc)\b/i;


const HOVER_CONTEXT = 'reghover.hoverActive';


function randomHex(bytes: number): string {
    let value = 0;
    for (let i = 0; i < bytes; i++) {
        value = (value << 8) | (Math.random() * 256) | 0;
    }
    return "0x" + value.toString(16).padStart(bytes * 2, "0").toUpperCase();
}

class LabelInfo {
	name: string = '';
	address: string = '';
	contents: string = ''
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




// Function to send a GDB command
async function sendGdbCommand(command: string) {
    const session = vscode.debug.activeDebugSession;

    if (session && (session.type === 'gdb' || session.type === 'cppdbg')) { // Check for GDB/C++ session types
        try {
            // The command to execute in the GDB console is "-exec <gdb command>"
            const execCommand = `-exec ${command}`;
            
            // Send the command as a "sendGDBCommand" custom request.
            // Note: The actual command name might vary slightly depending on the specific debug adapter being used (e.g., C/C++ extension uses the Debug Console for this format).
            // A more direct way using the debug console interface for general commands is via the evaluate request or custom requests if the adapter supports them.

            // The safest and most general approach to sending *raw* GDB commands from an extension is using
            // the 'evaluate' request with the "-exec" prefix, which is processed by the debug adapter
            // to run in the backend GDB instance.

            const result = await session.customRequest('evaluate', {
                expression: execCommand,
                context: 'repl' // Use the debug console context
            });

			return result;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to send GDB command: ${error}`);
        }
    } else {
        //vscode.window.showWarningMessage('No active GDB/C++ debug session found.');
    }
	return undefined;
}


async function updateRegisters() {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
		console.warn("REGHOVER: Failed to find debug session");
		return;
	}

	//console.log("Found debug session.");

    try {
		const threads = await session.customRequest("threads");
		const threadId = threads.threads[0]?.id;
		if (!threadId) {
			console.warn("REGHOVER: Failed to find threadID");
			return;
		}

		
       
        const stack = await session.customRequest("stackTrace", { threadId });
        if (!stack.stackFrames || stack.stackFrames.length === 0) {
			console.warn("REGHOVER: Failed to obtain stack frame information.");
			return;
		}

        const scopes = await session.customRequest("scopes", { frameId: stack.stackFrames[0].id });

        registerCache.clear();


      
        for (const scope of scopes.scopes) {
            if (!scope.variablesReference) { continue; }

            // fetch all registers recursively
            const registers = await fetchVariables(session, scope.variablesReference);
            for (const [name, value] of registers) {
                registerCache.set(name, value);
            }
        }
		
		return true;
    } catch {
		return false;
	}
}

// I couldn't get this to work since vscode will not call for a hover provider if the current label is a symbol found by the debugger.
async function try_var_hover(var_name: string): Promise<LabelInfo | undefined> {
	const label = new LabelInfo();
	try {
		//const resp = await vscode.commands.executeCommand('info address i32_limit_a');
		const resp = await sendGdbCommand(`info address ${var_name}`);
		const resp2 = await sendGdbCommand(`x/32xb &${var_name}`);
		
		//console.log("ADDR:",  resp);
		//console.log("SIZE:",  resp2);

		label.name = var_name;
		label.address = resp;
		label.contents = resp2;
		return label;
	} catch (err) {
		console.warn("Failed to get i32_limit_a. ERR: ", err);
		return undefined;
	}
}
function formatCBytes(input: string): string {
    // Match all numbers (decimal bytes)
    const matches = [...input.matchAll(/'(.)'/g)];

    if (!matches) return '';

    const bytes: string[] = [];

    for (const m of matches) {
        const n = m[1].charCodeAt(0);

        // Printable ASCII? (32-126)
        if (n >= 32 && n <= 126) {
            bytes.push(String.fromCharCode(n));
        } else {
            bytes.push(" /x"+n.toString(16).padStart(2, '0').toUpperCase());
        }
    }

    // Return as a single string
    return bytes.join('');
}



async function inspect_mem(inspectMode: string, length: number, address: string): Promise<string> {
	try {
		const result_wrapped = await sendGdbCommand(`x/${length}${inspectMode} ${address}`);
		const mem = result_wrapped.result;
		//vscode.window.showInformationMessage(`res: `);
		///vscode.window.showInformationMessage(`res: ${result_wrapped}`);

		if (mem!==undefined) {
			if (mem.includes('Cannot access memory at address')) {
				return '';
			} else {
				var cleaned = mem.replace(/0x[0-9a-fA-F]+(?: <[^>]+>)?:\s*/g, '');
				//console.log(`cleaned`,cleaned);
				if (inspectMode === 'c') {
					cleaned = formatCBytes(cleaned);
				}
				//vscode.window.showInformationMessage(`cleaned: `, cleaned);
				return cleaned;
			}
		}
		return '';
	} catch (error) {
		//console.log(`Error: failed to inspect memory. ERR: ${error}`)
		return '';
	}
}



// async function load_instruction_card(inst: string) instruction_card | undefined {

// }




// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	var hoverActive = false;
	var inspecting = false;
	var inspectModeIdx = 0;
	var inspectModes = ['bx', 'c'];


	vscode.commands.registerCommand('asmHover.inspectmode', () => {
		if (!hoverActive) {
			return;
		}
		inspecting = !inspecting;
	});

	vscode.commands.registerCommand('asmHover.nextmode', () => {
		if (!hoverActive) {
			return;
		}
		
		inspectModeIdx+=1;
		if (inspectModeIdx === inspectModes.length) {
			inspectModeIdx = 0;
		}
	});

	vscode.window.onDidChangeTextEditorSelection(() => {
		hoverActive = false;
		vscode.commands.executeCommand(
			'setContext',
			'reghover.hoverActive',
			false
		);
	});


	vscode.workspace.getConfiguration('debug').update('showInHover', false, vscode.ConfigurationTarget.Global);

	// Required bc for some reason vscode won't recognize my debugger config
	vscode.workspace.getConfiguration('debug').update('allowBreakpointsEverywhere', true, false);

	vscode.debug.onDidChangeActiveDebugSession(() => updateRegisters());
	vscode.debug.onDidReceiveDebugSessionCustomEvent(() => updateRegisters());


	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//vscode.window.showInformationMessage('REGHOVER is active!');


	vscode.languages.setLanguageConfiguration('nasm', {
		wordPattern: /[\w.$@]+:?/
	});

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		console.warn("No active editor!");
		return;
	}

    const hoverProvider: vscode.HoverProvider = {
        async provideHover(document, position) {
			hoverActive=true;

			vscode.commands.executeCommand(
				'setContext',
				'reghover.hoverActive',
				true
			);
			
            const range = document.getWordRangeAtPosition(position, REGISTER_REGEX);
            if (range) {

				const reg = document.getText(range).toLowerCase();

				const regSize = getRegisterSize(reg);

				// 8-bit vs 16-bit registers
				//const is8bit = reg.length === 2 && (reg.endsWith("h") || reg.endsWith("l"));
				//const value = randomHex(is8bit ? 1 : 2);

					
				await updateRegisters();

				//const jsonString = JSON.stringify(Object.fromEntries(registerCache));
				//console.log(jsonString);
				//console.log(Array.from(registerCache.entries()));

				if (vscode.debug.activeDebugSession)
				{
					var mdstr_contents = `[${regSize}] **${reg.toUpperCase()}** = \`${registerCache.get(reg)}\`\n \`${parseInt(registerCache.get(reg) ?? "0x0",16)}\``;
					if (inspecting) {
						if (registerCache.get(reg) !== undefined) 
						{
							const mem = await inspect_mem(inspectModes[inspectModeIdx], 32, registerCache.get(reg)  ?? "0x0");

							if (mem.length > 0) {
								mdstr_contents += '\n\n**Memory:**\n ```\n';
								const bytes = mem.split(' '); 
								
								for (let i = 0; i < bytes.length; i += 16) {
									mdstr_contents += bytes.slice(i, i + 16).join('');
								}

								mdstr_contents += '\n```';
							} else {
								mdstr_contents += `\n\n**NOT INSPECTABLE**\n`;
							}
						}
					}


					return new vscode.Hover(
							new vscode.MarkdownString(
								mdstr_contents
							)
						);
				} else {
					return new vscode.Hover(
						new vscode.MarkdownString(
							`[${regSize}] **${reg.toUpperCase()}**`
						)
					);
				}				
			} else {
				const wordRange = document.getWordRangeAtPosition(position);
    			if (!wordRange) {
					//console.warn("Failed to find label.");	
					return null;
				};


				// I couldn't get this to work since vscode will not call for a hover provider if the current label is a symbol found by the debugger.
				// also; i'd have to get the length of a symbol to inspect it properly; and i have no idea how to do that.
				//const varname = document.getText(wordRange).toLowerCase();
				// const label = await try_var_hover('i32_limit_a');
				// //console.log("label:", varname);

				// if (label !== undefined) {
				// 	return new vscode.Hover(
				// 		new vscode.MarkdownString(
				// 			`**${label}**`
				// 		)
				// 	);
				// } else {
				// 	return null;
				// }
				return null
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
}

// This method is called when your extension is deactivated
export function deactivate() {}


