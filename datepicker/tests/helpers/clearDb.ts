const clearDb = async (db) => {
    await db.collection('stores').deleteMany({})
    await db.collection('regions').deleteMany({})
    await db.collection('blocked_dates').deleteMany({})
    await db.collection('shipping_methods').deleteMany({})
    await db.collection('orders').deleteMany({})
    await db.collection('rules').deleteMany({})
}

export default clearDb