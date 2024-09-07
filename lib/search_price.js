module.exports = async function searchPrice(itemName) {
    const { request, gql } = await import('graphql-request'); // 동적으로 import
    const query = gql`
        {
            items(name: "${itemName}") {
                name
                avg24hPrice
                gridImageLink
                sellFor {
                    price
                    source
                    currency
                }
            }
        }
    `;

    try {
        const result = await request('https://api.tarkov.dev/graphql', query);
        console.log(result);
        return result;
    } catch (error) {
        console.error('Error fetching item data:', error);
    }
};
