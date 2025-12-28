const bcrypt = require('bcryptjs');

(async () => {
  const password = 'Admin@223';
  const hash = await bcrypt.hash(password, 12);
  console.log(hash);
})();