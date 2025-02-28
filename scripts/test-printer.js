const printer = require('printer');

console.log('Testing printer module...');

try {
    const printers = printer.getPrinters();
    console.log('Found printers:', printers);
    
    if (printers.length === 0) {
        console.log('No printers found. Please check if:');
        console.log('1. Your printer is connected and turned on');
        console.log('2. Your printer drivers are installed');
        console.log('3. Your printer is shared with Windows');
    } else {
        console.log('\nPrinter details:');
        printers.forEach((p, i) => {
            console.log(`\nPrinter ${i + 1}:`);
            console.log('Name:', p.name);
            console.log('Status:', p.status);
            console.log('Port:', p.port);
            console.log('Shared:', p.shared);
        });
    }
} catch (error) {
    console.error('Error testing printer:', error);
    console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
    });
} 