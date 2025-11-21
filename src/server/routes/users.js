import express from 'express';
import { getUserAll, getUserById, getUserByUsername, updateUser } from '../../utils/userUtil.js';
const router = express.Router();


// User list - HIỂN THỊ NHƯ PRODUCT MANAGEMENT
router.get('/', async (req, res) => {
    const users = await getUserAll();
    res.render('users/list', {
        title: 'User Management',
        active: 'users',
        users: users,
        pageCss: 'users.css',
    });
});

// Deposit form
router.get('/deposit/:id', async (req, res) => {
    const user = await getUserById(req.params.id);
    if (!user) {
        return res.redirect('/users');
    }
    res.render('users/deposit', {
        title: 'Deposit Money',
        active: 'users',
        user: user,
        pageCss: 'users.css'
    });
});

router.get('/search', async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        let users = [];

        if (searchQuery) {
            // Sử dụng hàm searchUsers mới
            users = await getUserByUsername(searchQuery);
        }

        res.render('users/list', {
            title: 'User Management',
            active: 'users',
            users: users,
            pageCss: 'users.css',
        });

    } catch (error) {
        console.error('Error in users route:', error);
        res.status(500).render('error', {
            message: 'Internal Server Error'
        });
    }
})

// Process deposit
router.post('/deposit/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const amount = parseFloat(req.body.amount);
    try {
        const user = await getUserById(userId);
        const usernew = await updateUser(userId, { balance: parseFloat(user.balance) + amount });

        res.redirect('/users');
    } catch (error) {
        console.log(error);
        throw error;
    }

});

export default router;