const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Server is up'));
app.listen(3000, () => {
console.log('TEST server on http:                   
console.log('//localhost:3000');
console.log('FILE:', __filename);
});
