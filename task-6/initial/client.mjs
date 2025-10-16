
(async () => {
    console.log('⌛ Starting client...');

    const traceId = crypto.randomUUID().replaceAll('-', '');
    console.log('🎯 Initial Trace ID: ', traceId);

    try {

        const response = await fetch('http://localhost:8081/api/jobs/trigger', {
            headers: {
                'X-Trace-Id': traceId,
            },
        });

        if (!response.ok) {
            console.error('❌ Response failed with status: ', response.status);
            const body = await response.text();
            console.error(body);

            process.exit(1);
            return;
        }

        const body = await response.text();

        console.log('✅ Response completed with body: ', body);
    } catch (e) {
        console.error('❌ Error: ', e.message);
        console.error(e);

        process.exit(1);
    }
})();