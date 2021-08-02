var pages = require('gh-pages')

pages.publish(
	'public',
	{
		branch: 'gh-pages',
		repo: 'https://github.com/LQR471814/Flex-Timer.git',
		user: {
			name: 'LQR471814',
			email: 'bramblefern1013@gmail.com'
		}
	},
	() => {
		console.log('Deploy complete!')
	}
)