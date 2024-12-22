import $ from 'jquery';
global.$ = global.jQuery = $;

// Désactiver le silence des logs Jest
jest.spyOn(global.console, 'log').mockImplementation((message) => {
    process.stdout.write(message + '\n');
});

jest.spyOn(global.console, 'warn').mockImplementation((message) => {
    process.stderr.write(message + '\n');
});

jest.spyOn(global.console, 'error').mockImplementation((message) => {
    process.stderr.write(message + '\n');
});

