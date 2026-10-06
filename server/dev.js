if (process.env.NODE_ENV === 'production') {
  throw new Error('The development API runner cannot be used in production.');
}

process.env.NODE_ENV = 'development';
await import('./index.js');
