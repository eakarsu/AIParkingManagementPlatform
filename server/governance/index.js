'use strict';
const { createRouter } = require('./router');
const { postgres } = require('./store');
const { evaluate } = require('./domain');
const db = require('../models/db');
const auth = require('../middleware/auth');

module.exports = createRouter({
  db: postgres(db), auth, evaluate, workflow: 'parking-fulfillment',
  providers: ['payments','tax','inventory','scheduling','messaging','accounting','delivery','navigation'],
  approverRoles: ['operations_manager','finance_reviewer','location_manager','refund_approver','admin']
});
