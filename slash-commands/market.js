const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const searchPrice = require('../lib/search_price'); // 모듈 전체를 불러옴

module.exports = {
    run: async ({ interaction }) => {
        await interaction.deferReply({ ephemeral: true });

        const itemName = interaction.options.getString('아이템이름');
        const result = await searchPrice(itemName);

        if (result && result.items && result.items.length > 0) {
            const itemsPerPage = 5; // 한 페이지에 보여줄 아이템 수
            let currentPage = 0;

            const generateEmbeds = page => {
                const embeds = [];
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;

                if (Array.isArray(result.items)) {
                    result.items.slice(start, end).forEach(item => {
                        const avgPrice =
                            item.avg24hPrice !== null ? `${item.avg24hPrice.toLocaleString()}₽` : '가격 정보 없음';

                        const sellForFields =
                            Array.isArray(item.sellFor) && item.sellFor.length > 0
                                ? item.sellFor.map(sell => ({
                                      name: sell.source,
                                      value: `${sell.price.toLocaleString()} ${sell.currency}`,
                                      inline: true,
                                  }))
                                : [{ name: '판매 정보 없음', value: '\u200B', inline: true }];

                        const itemEmbed = new EmbedBuilder()
                            .setColor(0x0099ff)
                            .setTitle(item.name)
                            .setThumbnail(item.gridImageLink)
                            .addFields({ name: '24시간 평균 가격', value: avgPrice })
                            .addFields(...sellForFields);

                        embeds.push(itemEmbed);
                    });
                }

                return embeds;
            };

            const generateRow = (page, disabled = false) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('이전')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(disabled || page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('다음')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(disabled || (page + 1) * itemsPerPage >= result.items.length)
                );
            };

            const sentMessage = await interaction.editReply({
                embeds: generateEmbeds(currentPage),
                components: [generateRow(currentPage)],
                ephemeral: true, // 자기 자신만 볼 수 있게 설정
            });

            const filter = i => ['prev', 'next'].includes(i.customId) && i.user.id === interaction.user.id;

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'prev') {
                    currentPage = Math.max(currentPage - 1, 0);
                } else if (i.customId === 'next') {
                    currentPage = Math.min(currentPage + 1, Math.ceil(result.items.length / itemsPerPage) - 1);
                }

                await i.update({
                    embeds: generateEmbeds(currentPage),
                    components: [generateRow(currentPage)],
                    ephemeral: true,
                });
            });

            collector.on('end', async collected => {
                // 상호작용이 끝나면 메시지 삭제
                setTimeout(() => {
                    try {
                        interaction.deleteReply();
                    } catch (error) {
                        console.log('메시지를 삭제하는 중 오류 발생:', error);
                    }
                }, 1000); // 1초 후에 메시지 삭제
            });
        } else {
            interaction.editReply({ content: '해당 아이템을 찾을 수 없습니다.', ephemeral: true });
            setTimeout(() => interaction.deleteReply(), 10000);
        }
    },

    data: new SlashCommandBuilder()
        .setName('1')
        .setDescription('아이템 플리마켓 가격 확인')
        .addStringOption(option =>
            option.setName('아이템이름').setDescription('입력한 아이템의 가격 확인').setRequired(true)
        ),
};
