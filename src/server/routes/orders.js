import express from 'express';
import { getAllOrders, getMonthRevenue, getOrderById, updateOrder } from '../../utils/orderUtil.js';
import { notifyUser } from '../../bot/sendMess.js'
import { getUserById, updateUser } from '../../utils/userUtil.js';
const router = express.Router();

// Order list
router.get('/', async (req, res) => {
    const orders = await getAllOrders();
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    orders.Total_Revenue = await getMonthRevenue(month, year)
    res.render('orders/list', {
        title: 'Order Management',
        active: 'orders',
        orders: orders,
        pageCss: 'orders.css'
    });
});

// Deliver order
router.post('/deliver/:id', async (req, res) => {
    const seller_note = req.body.delivery_note
    const orderId = parseInt(req.params.id);
    try {
        await updateOrder(orderId, { seller_note: seller_note, status: "success" });
        const message = `
✅ *Your Order Has Been Completed!*
────────────────────
💬 *Message from Seller:*
${seller_note}
`;
        const order = await getOrderById(orderId);
        await notifyUser(order.user_id, message);
    } catch (error) {
        console.log(error);
        throw error;
    }
    res.redirect('/orders');
});

// Cancel order
router.post('/cancel/:id', async (req, res) => {
    const orderId = parseInt(req.params.id);
    try {
        await updateOrder(orderId, { status: "cancelled" });
        const order = await getOrderById(orderId);
        const user = await getUserById(order.user_id);
        const message = `
❌ *Your Order Has Been Cancelled!*
────────────────────
💬 *Message from Seller:*
Dear customer, your ${order.product_name} order was canceled by the seller.
A total of ${order.total_amount}$ has been successfully refunded to your account balance.
`;

        await updateUser(order.user_id, { balance: parseFloat(user.balance) + parseFloat(order.total_amount) });
        await notifyUser(user.id, message)
    } catch (error) {
        console.log(error)
        throw error;
    }

    res.redirect('/orders');
});

export default router;