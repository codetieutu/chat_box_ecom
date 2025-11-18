import express from 'express';
import { createProduct, deleteProduct, getAllProducts, getProductById, updateProduct } from '../../utils/productUtil.js';
import { createVariant, deleteVariant, getVariantById, getVariantsByProduct, updateVariant } from '../../utils/variantUtil.js';
import { addStock } from '../../utils/stockUtil.js';
import { notifyAllUsers } from '../../bot/sendMess.js'
const router = express.Router();

// Product list
router.get('/', async (req, res) => {
    const products = await getAllProducts();
    res.render('products/list', {
        title: 'Product Management',
        active: 'products',
        products: products,
        pageCss: 'products.css'
    });
});

router.get('/stock-upload/:id', async (req, res) => {
    const productId = parseInt(req.params.id);
    const variantId = req.query.variant
    const product = await getProductById(productId);
    if (!product) {
        return res.redirect('/products');
    }
    const variant = await getVariantById(variantId);
    if (!variant) {
        return res.redirect('/products');
    }

    res.render('products/stock-upload', {
        title: 'Add Stock from File',
        active: 'products',
        product: product,
        variant: variant,
        pageCss: 'products.css'
    });
});

// Add product form
router.get('/add', (req, res) => {
    res.render('products/add', {
        title: 'Add Product',
        active: 'products',
        pageCss: 'products.css'
    });
});

// Edit product form
router.get('/edit/:id', async (req, res) => {
    const productId = req.params.id;
    const product = await getProductById(productId);
    res.render('products/edit', {
        title: 'Edit Product',
        active: 'products',
        product: product,
        pageCss: 'products.css'
    });
});


// Add product
router.post('/add', async (req, res) => {
    try {
        const newProduct = {
            name: req.body.name,
            description: req.body.description,
            type: req.body.type,
            price: parseFloat(req.body.price) || 0,
            stock: 0
        };
        await createProduct(newProduct);
        res.redirect('/products');
    } catch (error) {
        console.log(error);
    }

});

// Update product
router.post('/edit/:id', async (req, res) => {
    const productId = req.params.id;
    const { name, description } = req.body;
    try {
        await updateProduct(productId, { name, description });
        res.redirect('/products');
    } catch (err) {
        console.log(err);
    }

});
router.get('/variants/:id', async (req, res) => {
    const productId = req.params.id;
    const product = await getProductById(productId);
    if (!product) {
        return res.redirect('/products');
    }

    // Mock variants data - bạn có thể lấy từ database
    const variants = await getVariantsByProduct(productId);

    res.render('products/variants', {
        title: 'Edit Variants',
        active: 'products',
        product: product,
        variants: variants,
        pageCss: 'products.css'
    });
});

// Update variants
router.post('/variants/:id', async (req, res, next) => {
    const productId = parseInt(req.params.id, 10);
    const { variants = [], new_variants = [] } = req.body;
    if (new_variants.length > 0 && new_variants[0].variant_name != '') {
        try {
            for (const variant of new_variants) {
                variant.product_id = productId;
                await createVariant(variant);
                res.redirect('/products');
            }
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }

    try {
        for (const variant of variants) {
            await updateVariant(variant.id, { name: variant.name, price: variant.price, description: variant.description });
            res.redirect('/products');
        }
    }
    catch (error) {
        console.log(error);
        throw error;
    }

});

// Add stock with file upload form
router.get('/stock/:id', async (req, res) => {
    const product = await getProductById(req.params.id);
    if (!product) {
        return res.redirect('/products');
    }
    res.render('products/stock-upload', {
        title: 'Add Stock from File',
        active: 'products',
        product: product,
        pageCss: 'products.css'
    });
});

// Process stock upload
router.post('/stock-upload/:id', async (req, res) => {
    const variantId = parseInt(req.params.id);
    const { stockData } = req.body;
    let d = 0;
    try {

        const stocks = stockData
            .replace(/\r/g, '')
            .split('\n')
            .filter(line => line.trim() !== '');

        for (const stock of stocks) {
            await addStock(variantId, stock);
            d++;
        }

        const variant = await getVariantById(variantId);
        if (!variant) {
            console.warn('Variant not found for id', variantId);
        } else {
            const product = await getProductById(variant.product_id);

            // 4️⃣ Tạo message thông báo restock
            const message = `
Dear customers, RESTOCK NOTIFICATION🚨

🛒 Product: ${product ? product.name : 'Unknown product'}
🎫 Variant: ${variant.variant_name}
📊 Added stock: ${d} account(s)
            `.trim();


            await notifyAllUsers(message);
        }
        res.redirect('/products');
    } catch (error) {
        console.log(">>check error", error);
        throw error
    }


    // 
});

router.get('/variant/:id', async (req, res) => {
    res.redirect('/products');
    await deleteVariant(req.params.id);
})
// Delete product
router.post('/delete/:id', async (req, res) => {
    try {
        await deleteProduct(req.params.id);
    }
    catch (error) {
        console.log(error);
        throw error
    }
    res.redirect('/products');
});

export default router;