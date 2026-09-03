async function handleTestBoxCommand(interaction) {
    await interaction.deferReply();

    const game = gameManager.getGame(interaction.channelId);
    if (!game) {
        const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
        testGame.totalMoney = 50000; // Start with $50,000 for testing
        testGame.eventMode = true; // Enable event mode

        await interaction.editReply({ content: '🧪 **Test game created!** Starting Mystery Box...' });

        // Trigger Mystery Box minigame
        await handleMysteryBoxMinigame(interaction, testGame);
    } else {
        await interaction.editReply({ content: '❌ A game is already active in this channel. Stop it first with `/stopgame`.' });
    }
}
